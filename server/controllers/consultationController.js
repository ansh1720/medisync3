/**
 * Consultation Controller
 * Clean rebuild – every function uses req.user.userId (set by auth middleware)
 * Doctor model uses `userRef` to link to User.
 */

const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { getIO } = require('../utils/socket');
const razorpay = require('../utils/razorpay');

// ─── Helper: safe socket emit (never crashes if socket isn't ready) ───
const emitSafe = (room, event, data) => {
  try { getIO().to(room).emit(event, data); }
  catch (_) { /* socket not available */ }
};

// ────────────────────────────────────────────
// 1. GET /doctors – list / search doctors
// ────────────────────────────────────────────
exports.getDoctors = async (req, res) => {
  try {
    const { specialty, search, minRating, maxFee, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true, isVerified: true };
    if (specialty && specialty !== 'all') filter.specialty = specialty;
    if (minRating) filter['rating.average'] = { $gte: Number(minRating) };
    if (maxFee) filter['consultationFee.amount'] = { $lte: Number(maxFee) };

    const queryFilter = { ...filter };
    if (search) {
      queryFilter.$or = [
        { name: new RegExp(search, 'i') },
        { specialty: new RegExp(search, 'i') },
        { bio: new RegExp(search, 'i') }
      ];
    }

    const total = await Doctor.countDocuments(queryFilter);
    const doctors = await Doctor.find(queryFilter)
      .populate('hospitalAffiliation', 'name address')
      .sort({ 'rating.average': -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: doctors, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('getDoctors error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors' });
  }
};

// ────────────────────────────────────────────
// 2. GET /doctors/:doctorId – single doctor profile
// ────────────────────────────────────────────
exports.getDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.doctorId)
      .populate('hospitalAffiliation', 'name address')
      .lean();
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, data: doctor });
  } catch (err) {
    console.error('getDoctorProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch doctor profile' });
  }
};

// ────────────────────────────────────────────
// 3. GET /doctors/:doctorId/slots?date=YYYY-MM-DD
// ────────────────────────────────────────────
exports.getAvailableSlots = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const date = new Date(req.query.date || Date.now());
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[date.getDay()];

    // If doctor has availability configured for this day, use it; otherwise default 09:00-17:00
    const dayAvailability = doctor.availability.find(a => a.dayOfWeek === dayOfWeek);
    const timeSlots = (dayAvailability && dayAvailability.timeSlots.length > 0)
      ? dayAvailability.timeSlots
      : [{ startTime: '09:00', endTime: '17:00', isAvailable: true }];

    // Get all booked slots for that day
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(date); endOfDay.setHours(23, 59, 59, 999);

    const booked = await Consultation.find({
      doctorId: doctor._id,
      scheduledAt: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['requested', 'confirmed', 'in_progress'] }
    }).select('scheduledAt estimatedDuration').lean();

    const bookedMinutes = booked.map(b => {
      const d = new Date(b.scheduledAt);
      return d.getHours() * 60 + d.getMinutes();
    });

    const duration = doctor.preferences?.consultationDuration || 30;
    const slots = [];
    for (const slot of timeSlots) {
      if (!slot.isAvailable) continue;
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      let cur = sh * 60 + sm;
      const end = eh * 60 + em;
      while (cur + duration <= end) {
        const isBooked = bookedMinutes.includes(cur);
        slots.push({
          time: `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`,
          available: !isBooked
        });
        cur += duration;
      }
    }

    res.json({ success: true, data: slots });
  } catch (err) {
    console.error('getAvailableSlots error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch slots' });
  }
};

// ────────────────────────────────────────────
// 4. POST /book – book a consultation
// ────────────────────────────────────────────
exports.bookConsultation = async (req, res) => {
  try {
    const { doctorId, scheduledAt, symptoms, chiefComplaint, additionalNotes, consultationType } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    // Validate slot is available - check for conflicting consultations
    const scheduledTime = new Date(scheduledAt);
    const duration = doctor.preferences?.consultationDuration || 30;
    const slotEndTime = new Date(scheduledTime.getTime() + duration * 60000);

    const existingConsultation = await Consultation.findOne({
      doctorId: doctor._id,
      scheduledAt: scheduledTime,
      status: { $in: ['requested', 'confirmed', 'in_progress'] }
    });

    if (existingConsultation) {
      return res.status(400).json({
        success: false,
        message: 'This slot has already been booked. Please select another time.'
      });
    }

    const consultation = await Consultation.create({
      userId: req.user.userId,
      doctorId,
      scheduledAt: scheduledTime,
      symptoms: symptoms || [],
      chiefComplaint: chiefComplaint || '',
      additionalNotes: additionalNotes || '',
      consultationType: consultationType || 'video_call',
      estimatedDuration: duration,
      payment: {
        amount: doctor.consultationFee?.amount || 0,
        currency: doctor.consultationFee?.currency || 'USD',
        status: doctor.consultationFee?.amount ? 'pending' : 'paid'
      },
      status: 'requested' // doctor must accept
    });

    const populated = await Consultation.findById(consultation._id)
      .populate('doctorId', 'name specialty consultationFee')
      .populate('userId', 'name email');

    // Notify doctor
    emitSafe(`doctor_${doctorId}`, 'new_consultation', {
      consultationId: populated._id,
      patientName: populated.userId?.name,
      scheduledAt: populated.scheduledAt
    });

    res.status(201).json({ success: true, data: populated, message: 'Consultation booked successfully' });
  } catch (err) {
    console.error('bookConsultation error:', err);
    res.status(500).json({ success: false, message: 'Failed to book consultation' });
  }
};

// ────────────────────────────────────────────
// 5. GET /my-consultations – patient's list
// ────────────────────────────────────────────
exports.getMyConsultations = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user.userId };
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }

    const total = await Consultation.countDocuments(filter);
    const consultations = await Consultation.find(filter)
      .populate('doctorId', 'name specialty consultationFee rating')
      .sort({ scheduledAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: consultations, total });
  } catch (err) {
    console.error('getMyConsultations error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch consultations' });
  }
};

// ────────────────────────────────────────────
// 6. GET /doctor/consultations – doctor's list
// ────────────────────────────────────────────
exports.getDoctorConsultations = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userRef: req.user.userId });
    if (!doctor) return res.status(403).json({ success: false, message: 'Doctor profile not found' });

    const { status, date, page = 1, limit = 20 } = req.query;
    const filter = { doctorId: doctor._id };
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    if (date) {
      const d = new Date(date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end   = new Date(d); end.setHours(23, 59, 59, 999);
      filter.scheduledAt = { $gte: start, $lte: end };
    }

    const total = await Consultation.countDocuments(filter);
    const consultations = await Consultation.find(filter)
      .populate('userId', 'name email phone')
      .populate('doctorId', 'name specialty')
      .sort({ scheduledAt: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: consultations, total });
  } catch (err) {
    console.error('getDoctorConsultations error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch consultations' });
  }
};

// ────────────────────────────────────────────
// 7. GET /:id – single consultation details
// ────────────────────────────────────────────
exports.getConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate('doctorId', 'name specialty consultationFee rating bio')
      .populate('userId', 'name email phone');

    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });

    // Only the patient or the doctor can view
    const doctor = await Doctor.findOne({ userRef: req.user.userId });
    const isPatient = consultation.userId._id.toString() === req.user.userId;
    const isDoctor  = doctor && consultation.doctorId._id.toString() === doctor._id.toString();

    if (!isPatient && !isDoctor && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: consultation });
  } catch (err) {
    console.error('getConsultation error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch consultation' });
  }
};

// ────────────────────────────────────────────
// 8. POST /:id/join – join video session
// ────────────────────────────────────────────
exports.joinConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });

    if (consultation.status === 'confirmed') {
      consultation.status = 'in_progress';
      consultation.actualStartTime = new Date();
      await consultation.save();
    }

    res.json({ success: true, data: consultation, message: 'Joined consultation' });
  } catch (err) {
    console.error('joinConsultation error:', err);
    res.status(500).json({ success: false, message: 'Failed to join consultation' });
  }
};

// ────────────────────────────────────────────
// 9. POST /:id/complete – doctor completes consultation
// ────────────────────────────────────────────
exports.completeConsultation = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userRef: req.user.userId });
    if (!doctor) return res.status(403).json({ success: false, message: 'Doctor profile not found' });

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });
    if (consultation.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your consultation' });
    }

    const { diagnosis, doctorNotes, prescription, followUpRequired, followUpDate } = req.body;

    consultation.status = 'completed';
    consultation.actualEndTime = new Date();
    if (diagnosis) consultation.diagnosis = diagnosis;
    if (doctorNotes) consultation.doctorNotes = doctorNotes;
    if (followUpRequired !== undefined) consultation.followUpRequired = followUpRequired;
    if (followUpDate) consultation.followUpDate = new Date(followUpDate);
    if (prescription) {
      consultation.prescription = {
        medications: prescription.medications || [],
        generalInstructions: prescription.generalInstructions || '',
        issuedAt: new Date()
      };
    }

    await consultation.save();

    // Notify patient
    emitSafe(`user_${consultation.userId}`, 'consultation_completed', {
      consultationId: consultation._id
    });

    res.json({ success: true, data: consultation, message: 'Consultation completed' });
  } catch (err) {
    console.error('completeConsultation error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete consultation' });
  }
};

// ────────────────────────────────────────────
// 10. POST /:id/prescription – doctor adds/updates prescription
// ────────────────────────────────────────────
exports.addPrescription = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userRef: req.user.userId });
    if (!doctor) return res.status(403).json({ success: false, message: 'Doctor profile not found' });

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });
    if (consultation.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your consultation' });
    }

    const { medications, generalInstructions } = req.body;
    consultation.prescription = {
      medications: medications || [],
      generalInstructions: generalInstructions || '',
      issuedAt: new Date()
    };
    await consultation.save();

    emitSafe(`user_${consultation.userId}`, 'new_prescription', {
      consultationId: consultation._id
    });

    res.json({ success: true, data: consultation.prescription, message: 'Prescription saved' });
  } catch (err) {
    console.error('addPrescription error:', err);
    res.status(500).json({ success: false, message: 'Failed to save prescription' });
  }
};

// ────────────────────────────────────────────
// 11. POST /:id/cancel – cancel a consultation
// ────────────────────────────────────────────
exports.cancelConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });

    // Check ownership
    const doctor = await Doctor.findOne({ userRef: req.user.userId });
    const isPatient = consultation.userId.toString() === req.user.userId;
    const isDoctor  = doctor && consultation.doctorId.toString() === doctor._id.toString();
    if (!isPatient && !isDoctor && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (['completed', 'cancelled'].includes(consultation.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this consultation' });
    }

    consultation.status = 'cancelled';
    consultation.cancelledBy = isDoctor ? 'doctor' : 'patient';
    consultation.cancellationReason = req.body.reason || '';

    // Auto-refund if paid
    if (consultation.payment?.status === 'paid') {
      consultation.payment.status = 'refunded';
    }

    await consultation.save();

    // Notify the other party
    if (isPatient) {
      emitSafe(`doctor_${consultation.doctorId}`, 'consultation_cancelled', { consultationId: consultation._id });
    } else {
      emitSafe(`user_${consultation.userId}`, 'consultation_cancelled', { consultationId: consultation._id });
    }

    res.json({ success: true, data: consultation, message: 'Consultation cancelled' });
  } catch (err) {
    console.error('cancelConsultation error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel consultation' });
  }
};

// ────────────────────────────────────────────
// 12. POST /:id/initiate-payment – Create Razorpay order
// ────────────────────────────────────────────
exports.initiatePayment = async (req, res) => {
  try {
    console.log('[Payment] Initiating payment for consultation:', req.params.id);
    
    const consultation = await Consultation.findById(req.params.id)
      .populate('userId', 'name email');

    if (!consultation) {
      console.log('[Payment] Consultation not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    if (!consultation.userId) {
      console.log('[Payment] Consultation user reference missing:', req.params.id);
      return res.status(400).json({ success: false, message: 'Consultation data incomplete' });
    }

    // Verify the user owns this consultation
    if (consultation.userId._id.toString() !== req.user.userId) {
      console.log('[Payment] Unauthorized - user mismatch');
      return res.status(403).json({ success: false, message: 'Not your consultation' });
    }

    // Check if already paid
    if (consultation.payment?.status === 'paid') {
      console.log('[Payment] Consultation already paid');
      return res.status(400).json({ success: false, message: 'Consultation already paid' });
    }

    // Check if there's an amount to pay
    if (!consultation.payment?.amount || consultation.payment.amount === 0) {
      console.log('[Payment] No payment amount:', consultation.payment);
      return res.status(400).json({ success: false, message: 'No payment required for this consultation' });
    }

    console.log('[Payment] Creating order with amount:', consultation.payment.amount, consultation.payment.currency);
    
    // Create Razorpay order (pass currency for conversion if needed)
    const order = await razorpay.createOrder(
      consultation.payment.amount,
      consultation._id.toString(),
      consultation.userId.email,
      consultation.userId.name,
      consultation.payment.currency || 'INR'
    );

    console.log('[Payment] Order created:', order.id);
    
    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount / 100, // convert back from paise to rupees/currency
        currency: 'INR', // Razorpay will always process in INR
        consultationId: consultation._id,
        patientName: consultation.userId.name,
        patientEmail: consultation.userId.email
      },
      message: 'Payment order created'
    });
  } catch (error) {
    console.error('[Payment] Error initiating payment:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || 'Failed to initiate payment' });
  }
};

// ────────────────────────────────────────────
// 13. POST /:id/verify-payment – Verify Razorpay signature and mark as paid
// ────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    // Verify signature
    const isValidSignature = razorpay.verifyPaymentSignature(orderId, paymentId, signature);
    
    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Payment signature verification failed. Payment not verified.'
      });
    }

    // Find consultation and update payment status
    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    if (consultation.userId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not your consultation' });
    }

    // Mark as paid
    consultation.payment.status = 'paid';
    consultation.payment.method = 'razorpay';
    consultation.payment.paidAt = new Date();
    consultation.payment.razorpayOrderId = orderId;
    consultation.payment.razorpayPaymentId = paymentId;
    
    await consultation.save();

    // Notify doctor that payment is confirmed
    emitSafe(`doctor_${consultation.doctorId}`, 'consultation_payment_confirmed', {
      consultationId: consultation._id,
      orderId
    });

    res.json({
      success: true,
      data: consultation,
      message: 'Payment verified and consultation confirmed'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Payment verification failed' });
  }
};

// ────────────────────────────────────────────
// 14. POST /:id/pay – Legacy payment marking (kept for backward compatibility)
// ────────────────────────────────────────────
exports.payConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });
    if (consultation.userId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not your consultation' });
    }

    // If no payment required, just mark as paid
    if (!consultation.payment?.amount || consultation.payment.amount === 0) {
      consultation.payment.status = 'paid';
      consultation.payment.paidAt = new Date();
      await consultation.save();
    }

    res.json({ success: true, data: consultation, message: 'Payment successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Payment failed' });
  }
};

// ────────────────────────────────────────────
// 15. POST /:id/feedback – patient leaves feedback
// ────────────────────────────────────────────
exports.addFeedback = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });
    if (consultation.userId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not your consultation' });
    }
    if (consultation.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only review completed consultations' });
    }

    const { rating, comment } = req.body;
    consultation.feedback = { rating, comment, submittedAt: new Date() };
    await consultation.save();

    // Update doctor rating (don't let this fail the whole request)
    if (rating) {
      try {
        const doctor = await Doctor.findById(consultation.doctorId);
        if (doctor) {
          // Ensure rating sub-document exists
          if (!doctor.rating) {
            doctor.rating = { average: 0, reviewCount: 0 };
          }
          const currentTotal = (doctor.rating.average || 0) * (doctor.rating.reviewCount || 0);
          doctor.rating.reviewCount = (doctor.rating.reviewCount || 0) + 1;
          doctor.rating.average = (currentTotal + rating) / doctor.rating.reviewCount;
          await doctor.save();
        }
      } catch (ratingErr) {
        console.error('Failed to update doctor rating (feedback still saved):', ratingErr);
      }
    }

    res.json({ success: true, message: 'Feedback submitted' });
  } catch (err) {
    console.error('addFeedback error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
};

// ────────────────────────────────────────────
// 16. PUT /:id/pre-consultation – update symptoms / upload info before call
// ────────────────────────────────────────────
exports.updatePreConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });
    if (consultation.userId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not your consultation' });
    }
    if (['completed', 'cancelled'].includes(consultation.status)) {
      return res.status(400).json({ success: false, message: 'Cannot update this consultation' });
    }

    const { symptoms, chiefComplaint, additionalNotes, documents } = req.body;
    if (symptoms) consultation.symptoms = symptoms;
    if (chiefComplaint) consultation.chiefComplaint = chiefComplaint;
    if (additionalNotes !== undefined) consultation.additionalNotes = additionalNotes;
    if (documents) consultation.documents.push(...documents);

    await consultation.save();
    res.json({ success: true, data: consultation, message: 'Pre-consultation data updated' });
  } catch (err) {
    console.error('updatePreConsultation error:', err);
    res.status(500).json({ success: false, message: 'Failed to update pre-consultation data' });
  }
};

// ────────────────────────────────────────────
// 15. GET /doctor/stats – doctor dashboard stats
// ────────────────────────────────────────────
exports.getDoctorStats = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userRef: req.user.userId });
    if (!doctor) return res.status(403).json({ success: false, message: 'Doctor profile not found' });

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const [total, completed, todayCount, upcoming] = await Promise.all([
      Consultation.countDocuments({ doctorId: doctor._id }),
      Consultation.countDocuments({ doctorId: doctor._id, status: 'completed' }),
      Consultation.countDocuments({ doctorId: doctor._id, scheduledAt: { $gte: todayStart, $lte: todayEnd } }),
      Consultation.find({
        doctorId: doctor._id,
        status: { $in: ['confirmed', 'requested'] },
        scheduledAt: { $gte: now }
      }).populate('userId', 'name email').sort({ scheduledAt: 1 }).limit(5).lean()
    ]);

    res.json({
      success: true,
      data: {
        totalConsultations: total,
        completedConsultations: completed,
        todayAppointments: todayCount,
        upcomingConsultations: upcoming
      }
    });
  } catch (err) {
    console.error('getDoctorStats error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// ────────────────────────────────────────────
// 16. POST /:id/accept – doctor accepts consultation
// ────────────────────────────────────────────
exports.acceptConsultation = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userRef: req.user.userId });
    if (!doctor) return res.status(403).json({ success: false, message: 'Doctor profile not found' });

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });
    if (consultation.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your consultation' });
    }
    if (consultation.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Can only accept requested consultations' });
    }

    consultation.status = 'confirmed';
    await consultation.save();

    emitSafe(`user_${consultation.userId}`, 'consultation_confirmed', {
      consultationId: consultation._id
    });

    res.json({ success: true, data: consultation, message: 'Consultation confirmed' });
  } catch (err) {
    console.error('acceptConsultation error:', err);
    res.status(500).json({ success: false, message: 'Failed to accept consultation' });
  }
};

// ────────────────────────────────────────────
// 17. POST /:id/documents – upload documents (reports, x-rays, etc.)
// ────────────────────────────────────────────
exports.uploadDocuments = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });

    // Both patient and doctor can upload
    const isPatient = consultation.userId.toString() === req.user.userId;
    const doctor = await Doctor.findOne({ userRef: req.user.userId });
    const isDoctor = doctor && consultation.doctorId.toString() === doctor._id.toString();
    if (!isPatient && !isDoctor) {
      return res.status(403).json({ success: false, message: 'Not authorized for this consultation' });
    }

    if (['cancelled'].includes(consultation.status)) {
      return res.status(400).json({ success: false, message: 'Cannot upload to a cancelled consultation' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const newDocs = req.files.map(file => {
      // Store as base64 data URL
      const base64 = file.buffer.toString('base64');
      const dataUrl = `data:${file.mimetype};base64,${base64}`;
      const ext = file.originalname.split('.').pop().toLowerCase();
      let fileType = 'other';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) fileType = 'image';
      else if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) fileType = 'report';

      return {
        name: file.originalname,
        url: dataUrl,
        fileType,
        uploadedAt: new Date()
      };
    });

    consultation.documents.push(...newDocs);
    await consultation.save();

    res.json({ success: true, data: newDocs, message: `${newDocs.length} file(s) uploaded successfully` });
  } catch (err) {
    console.error('uploadDocuments error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload documents' });
  }
};

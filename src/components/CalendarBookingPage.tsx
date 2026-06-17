import React, { useState, useEffect } from 'react';
import { Tenant } from '../types';
import { Calendar, Clock, User, Phone, Mail, FileText, CheckCircle2, ShieldAlert, AlertTriangle } from 'lucide-react';

interface CalendarBookingPageProps {
  tenantId: string;
  tenants: Tenant[];
}

export const CalendarBookingPage: React.FC<CalendarBookingPageProps> = ({ tenantId, tenants }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingNote, setBookingNote] = useState('');

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to locate tenant in props
    const matched = tenants.find(t => t.id === tenantId);
    if (matched) {
      setTenant(matched);
      setLoading(false);
    } else {
      // Fallback: fetch directly from database API
      const fetchTenantDetails = async () => {
        try {
          const res = await fetch('/api/tenants');
          if (res.ok) {
            const data = await res.json();
            if (data[tenantId]) {
              setTenant(data[tenantId]);
            } else {
              setError("This business booking portal does not exist or has been deactivated.");
            }
          } else {
            setError("Unable to connect to the booking platform servers.");
          }
        } catch (err) {
          setError("A network error occurred while loading booking settings.");
        } finally {
          setLoading(false);
        }
      };
      fetchTenantDetails();
    }
  }, [tenantId, tenants]);

  // Generate next 14 business days (Mon-Fri)
  const getAvailableDates = () => {
    const dates: { dateStr: string; display: string }[] = [];
    let current = new Date();
    
    // Check next 14 calendar days, filtering for business days
    for (let i = 0; i < 20 && dates.length < 10; i++) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      
      // Mon (1) to Fri (5). Skip Sun (0) and Sat (6)
      if (day !== 0 && day !== 6) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        
        const display = current.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        dates.push({ dateStr, display });
      }
    }
    return dates;
  };

  // Define standard hourly slots from 9:00 AM to 5:00 PM
  const getSlotsForDate = (date: string) => {
    if (!date) return [];
    
    const standardHours = [
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
      { start: '11:00', end: '12:00' },
      { start: '12:00', end: '13:00' },
      { start: '13:00', end: '14:00' },
      { start: '14:00', end: '15:00' },
      { start: '15:00', end: '16:00' },
      { start: '16:00', end: '17:00' }
    ];

    return standardHours.map(hour => {
      const startIso = `${date}T${hour.start}:00`;
      const endIso = `${date}T${hour.end}:00`;
      
      // Verify overlap with tenant appointments
      const isBooked = (tenant?.appointments || []).some((appt: any) => {
        const apptStart = new Date(appt.start).getTime();
        const apptEnd = new Date(appt.end).getTime();
        const slotStart = new Date(startIso).getTime();
        const slotEnd = new Date(endIso).getTime();
        return slotStart < apptEnd && slotEnd > apptStart;
      });

      return {
        label: `${hour.start} - ${hour.end}`,
        start: startIso,
        end: endIso,
        isBooked
      };
    });
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !selectedSlot || !customerName || !customerPhone || !customerEmail) {
      setSubmitError("Please fill out all required fields and select an open time slot.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/tenant/${tenant.id}/appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          email: customerEmail,
          start: selectedSlot.start,
          end: selectedSlot.end,
          summary: `Online Booking: ${tenant.name} Consultation`
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessBooking(data.appointment);
      } else {
        setSubmitError(data.error || "The requested time slot has just been reserved. Please select another slot.");
      }
    } catch (err) {
      setSubmitError("Network connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05070a] flex items-center justify-center font-sans text-slate-350 p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
          <p className="text-xs font-mono tracking-widest text-slate-400 uppercase">Synchronizing Booking Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-[#05070a] flex items-center justify-center font-sans text-slate-300 p-6">
        <div className="max-w-md w-full bg-[#080b12] border border-white/5 p-8 rounded-3xl shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider font-mono">Access Restriction</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {error || "The requested booking configuration is unavailable."}
            </p>
          </div>
          <a
            href="/"
            className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all shadow-[0_0_12px_rgba(37,99,235,0.4)]"
          >
            Return to SaaS Home
          </a>
        </div>
      </div>
    );
  }

  const availableDates = getAvailableDates();
  const slots = selectedDate ? getSlotsForDate(selectedDate) : [];

  return (
    <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center font-sans text-slate-300 py-12 px-4 relative overflow-hidden">
      {/* Decorative background glow rings */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="max-w-3xl w-full bg-[#080b12]/90 backdrop-blur-md border border-white/5 rounded-3xl shadow-2xl p-6 sm:p-10 relative overflow-hidden">
        {/* Success screen */}
        {successBooking ? (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-bounce">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Booking Confirmed!</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Thank you, <span className="text-emerald-450 font-semibold">{customerName}</span>. Your appointment slot at <span className="font-semibold text-white">{tenant.name}</span> has been synchronized.
              </p>
            </div>

            {/* Ticket details */}
            <div className="bg-[#0d121d] border border-white/5 p-5 rounded-2xl max-w-md mx-auto text-left space-y-3.5 font-mono text-[11px] relative">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-500">APPOINTMENT ID</span>
                <span className="text-slate-300 font-bold">{successBooking.id}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-500">ORGANIZATION</span>
                <span className="text-slate-300 font-bold">{tenant.name}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-500">START DATE/TIME</span>
                <span className="text-blue-400 font-bold">
                  {new Date(successBooking.start).toLocaleDateString()} at {new Date(successBooking.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-500">END DATE/TIME</span>
                <span className="text-slate-300">
                  {new Date(successBooking.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PHONE REGISTERED</span>
                <span className="text-slate-300">{customerPhone}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSuccessBooking(null);
                setSelectedDate('');
                setSelectedSlot(null);
                setCustomerName('');
                setCustomerEmail('');
                setCustomerPhone('');
                setBookingNote('');
              }}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer"
            >
              Book Another Session
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Header row */}
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
              <div className="text-3xl sm:text-4xl">{tenant.avatar || '🏢'}</div>
              <div>
                <span className="px-2 py-0.5 rounded-full bg-blue-550/15 border border-blue-500/20 text-blue-400 text-[9px] font-bold font-mono uppercase tracking-wider">
                  {tenant.industry} Portal
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">{tenant.name}</h1>
                <p className="text-xs text-slate-400 mt-1">{tenant.description}</p>
              </div>
            </div>

            {/* Error notifications */}
            {submitError && (
              <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-xs text-red-400 flex items-start gap-2.5 shadow-[0_0_12px_rgba(239,68,68,0.05)]">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 animate-pulse" />
                <span className="font-mono">{submitError}</span>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-6">
              {/* Step 1: Select Date */}
              <div className="space-y-3">
                <label className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  <span>1. Select Date</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {availableDates.map(d => (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d.dateStr);
                        setSelectedSlot(null);
                      }}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold font-mono text-center transition-all cursor-pointer ${
                        selectedDate === d.dateStr
                          ? 'bg-blue-600/15 border-blue-500/35 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                          : 'bg-[#0d121d] border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      {d.display}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Time Slot */}
              {selectedDate && (
                <div className="space-y-3 animate-fade-in">
                  <label className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-emerald-500" />
                    <span>2. Available Hourly Slots</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {slots.map((s, idx) => {
                      const isSelected = selectedSlot?.start === s.start;
                      
                      if (s.isBooked) {
                        return (
                          <div
                            key={idx}
                            className="px-3 py-2.5 rounded-xl bg-slate-900 border border-transparent text-slate-600 text-xs font-mono text-center select-none line-through"
                            title="Reserved Slot"
                          >
                            {s.label}
                          </div>
                        );
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedSlot(s)}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-semibold font-mono text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600/15 border-emerald-500/35 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                              : 'bg-[#0d121d] border-white/5 text-slate-350 hover:text-white hover:border-white/10'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Customer Details */}
              {selectedSlot && (
                <div className="space-y-4 animate-fade-in border-t border-white/5 pt-6">
                  <label className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-purple-500" />
                    <span>3. Booking Details</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 block font-semibold">Full Name:</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full bg-[#0d121d] text-slate-100 placeholder-slate-500 text-xs pl-10 pr-4 py-2 border border-white/5 focus:border-blue-500/50 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-all"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 block font-semibold">Email Address:</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                        <input
                          type="email"
                          required
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="e.g. name@domain.com"
                          className="w-full bg-[#0d121d] text-slate-100 placeholder-slate-500 text-xs pl-10 pr-4 py-2 border border-white/5 focus:border-blue-500/50 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-all"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 block font-semibold">Phone Number:</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="e.g. +1 (555) 019-2831"
                          className="w-full bg-[#0d121d] text-slate-100 placeholder-slate-500 text-xs pl-10 pr-4 py-2 border border-white/5 focus:border-blue-500/50 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 block font-semibold">Notes / Special Requests:</label>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-500" />
                      <textarea
                        value={bookingNote}
                        onChange={(e) => setBookingNote(e.target.value)}
                        placeholder="Provide details about your query or expectations..."
                        rows={3}
                        className="w-full bg-[#0d121d] text-slate-100 placeholder-slate-500 text-xs pl-10 pr-4 py-3 border border-white/5 focus:border-blue-500/50 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Processing reservation...</span>
                        </>
                      ) : (
                        <span>Confirm Appointment Reservation</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

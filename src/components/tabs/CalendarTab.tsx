import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { useLanguage } from '../../LanguageContext';
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Clock,
  Trash2,
  Zap
} from 'lucide-react';

export const CalendarTab: React.FC = () => {
  const { t } = useLanguage();
  const {
    googleToken,
    loadGoogleCalendar,
    isSyncingCalendar,
    handleGoogleLogin,
    eventPendingDelete,
    setEventPendingDelete,
    handleConfirmCancelEvent,
    calendarError,
    selectedTenant,
    updateTenantFields,
    activeAppointments,
    handleGoogleLogout,
    user
  } = useSaaS();

  if (!selectedTenant) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-medium tracking-tight text-white">{t('calendarTitle')}</h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">{t('calendarSub')}</p>
        </div>
        {googleToken ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadGoogleCalendar(googleToken)}
              disabled={isSyncingCalendar}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#080b12] hover:bg-white/5 text-slate-200 border border-white/5 text-xs font-semibold rounded-xl shrink-0 cursor-pointer disabled:opacity-40 transition-colors"
              id="calendar-sync-btn"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
              <span>Force Sync Feed</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleGoogleLogin}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_12px_rgba(37,99,235,0.4)] cursor-pointer shrink-0 transition-all border border-blue-500/20"
            id="calendar-signin"
          >
            <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
            <span>Authenticate Google Account</span>
          </button>
        )}
      </div>

      {/* Custom confirmation banner before destructive deletion events */}
      {eventPendingDelete && (
        <div className="p-5 rounded-2xl border border-red-500/30 bg-red-500/5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden" id="calendar-destructive-confirm bg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-start gap-3.5 z-10">
            <div className="p-2.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-xl shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
              <AlertCircle className="h-5 w-5 animate-pulse text-red-400" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Cancel Meeting Booking?</h4>
              <p className="text-xs text-slate-400 leading-normal mt-1 max-w-xl font-mono">
                Are you sure you want to cancel the booking for <strong>"{eventPendingDelete.name}"</strong>? This will remove the event directly from {eventPendingDelete.isGoogle ? 'your actual Google Calendar' : 'our sandbox database'}. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 z-10">
            <button
              onClick={() => setEventPendingDelete(null)}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:bg-white/5 rounded-lg font-mono cursor-pointer"
              id="cancel-deletion-btn"
            >
              Keep Booking
            </button>
            <button
              onClick={handleConfirmCancelEvent}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg shadow-[0_0_12px_rgba(239,68,68,0.4)] shrink-0 cursor-pointer"
              id="confirm-deletion-btn"
            >
              Cancel Meeting
            </button>
          </div>
        </div>
      )}

      {/* Calendar feed displays */}
      {calendarError && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-300 text-xs flex gap-2 font-mono">
          <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />
          <span>{calendarError}</span>
        </div>
      )}

      {/* Appointment Settings & Synchronization Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="appointment-settings-container">
        {/* Google Calendar Linkage Setting card */}
        <div className="p-5 rounded-2xl bg-[#080b12] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col justify-between" id="google-calendar-connection-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 bg-blue-500/10 border border-blue-500/25 rounded-xl text-blue-400 shrink-0">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Google Calendar Connection</h4>
                <p className="text-[11px] font-mono text-slate-400">Secure link with Google Workspace API</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-normal">
              Link your business Google Calendar to enable real-time sync, verify sync status, resolve conflicting slots, and book clients autonomously.
            </p>
          </div>

          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {googleToken && user ? (
              <div className="flex items-center gap-2.5">
                <img src={user.photoURL || ''} alt="G" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full border-2 border-emerald-500 object-cover shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-white block truncate max-w-[200px]">Connected: {user.email}</span>
                  <span className="text-[9px] font-mono text-emerald-450 uppercase tracking-widest flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Sync Status: Verified
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 py-1">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Status: Disconnected</span>
              </div>
            )}

            <div className="flex items-center gap-2 shrink-0 bg-transparent">
              {googleToken ? (
                <>
                  <button
                    onClick={() => loadGoogleCalendar(googleToken)}
                    disabled={isSyncingCalendar}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-205 border border-white/10 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40"
                    id="settings-verify-sync"
                    title="Verify sync connection and reload events"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                    <span>Verify Sync</span>
                  </button>
                  <button
                    onClick={handleGoogleLogout}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[11px] font-bold border border-red-500/20 rounded-lg cursor-pointer transition-colors"
                    id="settings-disconnect-calendar"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGoogleLogin}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_12px_rgba(37,99,235,0.4)] cursor-pointer transition-all border border-blue-500/20"
                  id="settings-connect-calendar"
                >
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />
                  <span>Connect Google Calendar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Real-Time Auto-Scheduling Control card */}
        <div className="p-5 rounded-2xl bg-[#080b12] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col justify-between" id="google-calendar-auto-schedule-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/25 rounded-xl text-indigo-400 shrink-0">
                <Zap className="h-4 w-4 animate-pulse text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Real-Time Auto-Scheduling</h4>
                <p className="text-[11px] font-mono text-slate-400">Autonomous bot calendar slots coordination</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-normal">
              Toggle real-time auto-scheduling to authorize the AI chatbot to automatically reserve available slots on Google Calendar and generate events live.
            </p>
          </div>

          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Auto-Scheduling:</span>
                {selectedTenant.googleCalendarAutoSchedule !== false ? (
                  <span className="text-indigo-400 font-bold">Enabled</span>
                ) : (
                  <span className="text-amber-500 font-bold">Paused (Local only)</span>
                )}
              </div>
              <span className="text-[9.5px] text-slate-500 leading-normal mt-0.5">
                {!googleToken 
                  ? "Requires connected Google account" 
                  : selectedTenant.googleCalendarAutoSchedule !== false 
                  ? "Bookings will post to Google live" 
                  : "Bookings remain in local sandbox cache"
                }
              </span>
            </div>

            {/* Toggle button */}
            <button
              onClick={() => {
                if (!googleToken) {
                  handleGoogleLogin();
                } else {
                  const currentVal = selectedTenant.googleCalendarAutoSchedule !== false;
                  updateTenantFields({ googleCalendarAutoSchedule: !currentVal });
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                googleToken && selectedTenant.googleCalendarAutoSchedule !== false ? 'bg-indigo-600' : 'bg-slate-700/50'
              }`}
              id="toggle-auto-schedule-btn"
              role="switch"
              aria-checked={googleToken && selectedTenant.googleCalendarAutoSchedule !== false}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  googleToken && selectedTenant.googleCalendarAutoSchedule !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Local Sandbox to Google Calendar Synchronization Alert status banner */}
      {googleToken && selectedTenant?.appointments?.some(a => !a.syncedWithGoogle) && (
        <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 font-mono shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/3 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex gap-2.5 items-center z-10">
            <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg">
              <Sparkles className="h-4 w-4 animate-pulse text-yellow-400" />
            </div>
            <span>
              Found unsynchronized bot-scheduled bookings! Let's link them instantly to the live <strong>{user?.email || 'authenticated'}</strong> account.
            </span>
          </div>
          <button
            onClick={() => loadGoogleCalendar(googleToken)}
            disabled={isSyncingCalendar}
            className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-40 z-10"
          >
            {isSyncingCalendar ? 'Syncing...' : 'Sync Pending Bookings'}
          </button>
        </div>
      )}

      {/* Display events grid list */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-white uppercase tracking-wider font-mono text-slate-400">
          {googleToken ? 'Synchronized Google Calendar Events List:' : 'Mock Sandbox Calendar Bookings list:'}
        </h3>

        {activeAppointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/5 p-12 text-center text-slate-500 bg-[#080b12] shadow-xl">
            <CalendarIcon className="h-10 w-10 mx-auto mb-3 text-slate-600" />
            <h4 className="font-semibold text-white text-sm mb-1">Schedule is clear</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-normal">
              No appointments currently booked. Jump into the WhatsApp Simulator tab and test a message like "I want to schedule an appointment" to watch the bot coordinate calendar slots automatically!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAppointments.map((appt) => {
              const dateObj = new Date(appt.start);
              const endObj = new Date(appt.end);
              return (
                <div key={appt.id} className="p-4 bg-[#080b12] hover:bg-white/5 rounded-2xl border border-white/5 text-xs relative group transition-all shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded-full border ${
                        appt.syncedWithGoogle ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_6px_rgba(16,185,129,0.15)]' : 'bg-slate-500/10 text-slate-400 border-white/5'
                      }`}>
                        {appt.syncedWithGoogle ? 'Synced with Google Cal' : 'Sandbox (Offline)'}
                      </span>
                      <div className="text-[10px] text-slate-450 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-snug mb-1">{appt.customerName}</h4>
                    <p className="text-[11px] text-slate-400 font-mono leading-relaxed mb-3">
                      From: {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to {endObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {appt.notes && (
                      <p className="text-[10.5px] italic text-slate-400 border-l-2 border-white/5 pl-2 leading-normal">
                        "{appt.notes}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-2 border-t border-white/5 flex justify-end">
                    <button
                      onClick={() => setEventPendingDelete({
                        id: appt.id,
                        name: appt.customerName,
                        isGoogle: !!appt.syncedWithGoogle
                      })}
                      className="text-[11px] font-mono text-red-400 hover:bg-red-500/10 py-1.5 px-3 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                      id={`cancel-reservation-btn-${appt.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Cancel Booking</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

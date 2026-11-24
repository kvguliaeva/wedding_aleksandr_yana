import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'framer-motion';
import { weddingConfig as config } from './config';
import { getCalendar } from './wedding';
import { isGoogleEndpoint, loadRsvpEndpoint, sendRsvp, type GuestResponse } from './google-rsvp';

const calendar = getCalendar(config.weddingDate, config.timeZone);

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}

function Hero() {
  return <section className="hero relative isolate text-center" aria-labelledby="couple-names">
    <svg className="flourish hero-flourish" viewBox="0 0 800 780" fill="none" aria-hidden="true"><path d="M-100 112C70 64 95 181 264 198S674 192 663 360C658 426 623 422 624 399C626 363 704 435 654 449C596 466 567 420 572 469C582 568 813 672 738 700C684 719 522 673 478 636" stroke="currentColor" strokeWidth="0.8" /></svg>
    <Reveal className="hero-content">
      <p className="wedding-word">{config.hero.label}</p>
      <h1 id="couple-names" className="couple-names"><span>{config.couple.groom}</span><i>&</i><span>{config.couple.bride}</span></h1>
      <p className="wedding-date"><time dateTime={config.weddingDate}>{calendar.dateLabel}</time></p>
      <div className="botanical"><img src={config.flower} width="626" height="626" alt="Изящная цветочная иллюстрация с нежно-зелёными лепестками" fetchPriority="high" /></div>
      <a className="scroll-cue" href="#welcome"><span>{config.hero.scrollLabel}</span><span className="scroll-line" aria-hidden="true" /></a>
    </Reveal>
  </section>;
}

function Welcome() {
  return <section id="welcome" className="welcome-section section" aria-labelledby="welcome-heading"><Reveal>
    <p className="eyebrow welcome-eyebrow">ВМЕСТЕ В САМОМ ВАЖНОМ</p>
    <h2 id="welcome-heading" className="section-title welcome-title">{config.greeting.title.split('\n').map(line => <span key={line}>{line}</span>)}</h2>
    {config.greeting.paragraphs.map(paragraph => <p className="body-copy" key={paragraph}>{paragraph}</p>)}
    <p className="signature">{config.greeting.signature}</p>
  </Reveal></section>;
}

function Calendar() {
  return <section className="calendar-section section" aria-labelledby="calendar-heading"><Reveal>
    <p id="calendar-heading" className="eyebrow">{config.calendar.title}</p>
    <div className="calendar"><h2 className="calendar-month">{calendar.label} <span>/</span> {calendar.year}</h2>
      <table aria-label={`Календарь: ${calendar.label} ${calendar.year}`}>
        <thead><tr>{['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
        <tbody>{Array.from({ length: calendar.cells.length / 7 }, (_, row) => <tr key={row}>{calendar.cells.slice(row * 7, row * 7 + 7).map((day, column) => <td key={column}>{day === calendar.day ? <span className="wedding-day" aria-label={`${day} — день свадьбы`}><svg className="wedding-heart" viewBox="0 0 48 44" aria-hidden="true"><path d="M24 42 5.5 24.2C-2.6 16.4 2 3 12.3 3 17.4 3 21.1 5.6 24 9.2 26.9 5.6 30.6 3 35.7 3 46 3 50.6 16.4 42.5 24.2L24 42Z" /></svg><span className="wedding-day-number">{day}</span></span> : day}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <p className="calendar-note">{config.calendar.note}</p>
    <div className="arrival"><p className="eyebrow">{config.calendar.arrivalTitle}</p><p className="arrival-time"><time dateTime={config.weddingDate}>{config.calendar.arrivalTime}</time></p></div>
  </Reveal></section>;
}

function Venue() {
  return <section className="location-section section" id="location" aria-labelledby="location-heading">
    <Reveal><h2 id="location-heading" className="section-title">{config.venue.title}</h2><p className="venue-name">{config.venue.name}</p><p className="venue-address">{config.venue.address}</p></Reveal>
    <Reveal className="venue-image-wrap"><img className="venue-image" src={config.venue.image} alt={config.venue.imageAlt} width="1200" height="800" loading="lazy" /></Reveal>
    <Reveal><p className="body-copy location-description">{config.venue.description}</p><a className="outline-button" href={config.venue.mapUrl} target="_blank" rel="noopener noreferrer">{config.venue.button}</a></Reveal>
  </section>;
}

function RsvpForm({ endpoint, loading, onClose }: { endpoint: string; loading: boolean; onClose: () => void }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const requestId = useRef('');
  const [attendance, setAttendance] = useState<'yes' | 'no' | ''>('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const ready = isGoogleEndpoint(endpoint);
  useEffect(() => { nameRef.current?.focus({ preventScroll: true }); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attendance) { setStatus('error'); setMessage('Пожалуйста, выберите вариант присутствия.'); return; }
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    if (name.length < 2) { setStatus('error'); setMessage('Пожалуйста, укажите имя и фамилию.'); nameRef.current?.focus(); return; }
    requestId.current ||= crypto.randomUUID();
    const data: GuestResponse = { requestId: requestId.current, name, attendance, companions: attendance === 'yes' ? String(form.get('companions') || '').trim() : '', weddingDate: config.weddingDate };
    setStatus('sending'); setMessage('');
    try { await sendRsvp(endpoint, data); setStatus('sent'); }
    catch (error) { setStatus('error'); setMessage(error instanceof Error && !['AbortError', 'TypeError'].includes(error.name) ? error.message : 'Не удалось отправить ответ. Данные остались в анкете. Пожалуйста, попробуйте ещё раз.'); }
  }

  return <form id="rsvp-form" className="rsvp-form" onSubmit={submit} onChange={() => { requestId.current = ''; if (status === 'error') { setStatus('idle'); setMessage(''); } }} aria-label="Подтверждение присутствия" aria-busy={status === 'sending'}>
    {status === 'sent' ? <div className="form-success" role="status"><h3 className="detail-title">Спасибо за ваш ответ!</h3><p>Ваш ответ сохранён. {attendance === 'yes' ? 'Будем счастливы увидеть вас на нашем празднике!' : 'Спасибо, что сообщили. Вы будете с нами в наших сердцах.'}</p><button type="button" className="text-button" onClick={onClose}>Закрыть анкету</button></div> : <>
      <div className="form-field"><label htmlFor="guest-name">Ваше имя и фамилия <span aria-hidden="true">*</span></label><input ref={nameRef} id="guest-name" name="name" autoComplete="name" placeholder="Как к вам обращаться?" required minLength={2} maxLength={120} disabled={status === 'sending'} /></div>
      <fieldset disabled={status === 'sending'}><legend>Вы разделите с нами этот день? <span aria-hidden="true">*</span></legend><label className="choice"><input type="radio" name="attendance" value="yes" required checked={attendance === 'yes'} onChange={() => setAttendance('yes')} /><span>С радостью буду!</span></label><label className="choice"><input type="radio" name="attendance" value="no" required checked={attendance === 'no'} onChange={() => setAttendance('no')} /><span>К сожалению, не смогу</span></label></fieldset>
      <AnimatePresence initial={false}>{attendance !== 'no' && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="companions-field"><div className="form-field"><label htmlFor="guest-companions">{config.rsvp.companionsQuestion}</label><textarea id="guest-companions" name="companions" maxLength={500} rows={3} placeholder={config.rsvp.companionsPlaceholder} aria-describedby="companions-hint" disabled={status === 'sending'} /><p id="companions-hint" className="field-hint companions-hint">{config.rsvp.companionsHint}</p></div></motion.div>}</AnimatePresence>
      {!ready && <p className="form-note" role="status">{loading ? 'Подготавливаем анкету…' : 'Приём ответов скоро откроется. Пожалуйста, загляните чуть позже.'}</p>}
      <div aria-live="polite" aria-atomic="true">{message && <p className="form-message is-error" role="alert">{message}</p>}</div>
      <button className="outline-button form-submit" type="submit" disabled={!ready || status === 'sending'}>{status === 'sending' ? 'Сохраняем ответ…' : 'Отправить ответ'}</button>
      <button type="button" className="text-button" onClick={onClose} disabled={status === 'sending'}>Свернуть анкету</button>
    </>}
  </form>;
}

function Rsvp() {
  const [open, setOpen] = useState(false);
  const [endpoint, setEndpoint] = useState(config.rsvp.endpoint);
  const [loading, setLoading] = useState(true);
  const reduced = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { let active = true; loadRsvpEndpoint(config.rsvp.endpoint).then(value => { if (active) setEndpoint(value); }).catch(() => {}).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  function close() { setOpen(false); buttonRef.current?.focus({ preventScroll: true }); }
  return <section className="rsvp-section section" id="rsvp" aria-labelledby="rsvp-heading">
    <Reveal><p className="eyebrow rsvp-eyebrow">ВАШЕ ПРИСУТСТВИЕ — ЛУЧШИЙ ПОДАРОК</p><h2 id="rsvp-heading" className="section-title">{config.rsvp.title}</h2><p className="body-copy">{config.rsvp.introduction}</p><p className="rsvp-deadline"><time dateTime={config.rsvp.deadline}>{config.rsvp.deadlineLabel}</time></p><button ref={buttonRef} type="button" className="outline-button" aria-expanded={open} aria-controls="rsvp-panel" onClick={() => setOpen(value => !value)}>{open ? 'Свернуть' : config.rsvp.button}</button></Reveal>
    <div id="rsvp-panel"><AnimatePresence initial={false}>{open && <motion.div className="rsvp-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}><RsvpForm endpoint={endpoint} loading={loading} onClose={close} /></motion.div>}</AnimatePresence></div>
  </section>;
}

function Closing() {
  return <footer id="closing" className="organizers closing text-center" aria-labelledby="closing-heading"><Reveal>
    <p className="eyebrow closing-eyebrow">ЭТОТ ДЕНЬ МЫ ХОТИМ РАЗДЕЛИТЬ С ВАМИ</p>
    <h2 id="closing-heading" className="section-title closing-title">{config.closing.title.split('\n').map(line => <span key={line}>{line}</span>)}</h2>
    <p className="body-copy">{config.closing.text}</p>
    <div className="footer-rule" />
    <p className="footer-closing">{config.closing.signature}</p>
    <p className="footer-monogram">{config.couple.groom[0]} <span>&</span> {config.couple.bride[0]}</p>
    <p className="footer-date">{calendar.dateLabel}</p>
  </Reveal></footer>;
}

export default function App() {
  return <MotionConfig reducedMotion="user"><a href="#welcome" className="skip-link">Перейти к приглашению</a><main><Hero /><Welcome /><Calendar /><Venue /><Rsvp /></main><Closing /></MotionConfig>;
}

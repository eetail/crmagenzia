port { 
  Shield, AlertTriangle, Users, FileText, CheckCircle2, 
  XCircle, Clock, MapPin, Plus, Trash2, ArrowRight, 
  TrendingUp, Building2, Phone, Mail, LogOut, Lock, KeyRound, RefreshCw,
  Calendar, Award, DollarSign
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- INIZIALIZZAZIONE CLIENT SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- INTERFACCE TYPESCRIPT ---
interface Indirizzo {
  id: number;
  soggetto_id?: number;
  label: string;
  via: string;
}

interface Offerta {
  id: number;
  soggetto_id?: number;
  ramo: string;
  compagnia: string;
  premio: number;
  data_offerta: string;
  stato: 'IN_TRATTATIVA' | 'VINTA' | 'PERSA';
  motivazione_perdita?: string;
}

interface Legame {
  id?: number;
  nome_legame: string;
  tipo_legame: string;
  target_tipo: string;
}

interface Soggetto {
  id: number;
  nome: string;
  codice_fiscale: string;
  stato: 'CLIENTE_ATTIVO' | 'PROSPECT' | 'CONTATTO_COLLEGATO';
  professione: string;
  telefono: string;
  email: string;
  indirizzi?: Indirizzo[];
  legami?: Legame[];
  offerte?: Offerta[];
}

export default function InsureCRMApp() {
  // --- STATO AUTENTICAZIONE ---
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATO APPLICAZIONE ---
  const [vistaAttiva, setVistaAttiva] = useState<'alert' | 'anagrafica' | 'offerte'>('anagrafica');
  const [soggetti, setSoggetti] = useState<Soggetto[]>([]);
  const [soggettoSelezionatoId, setSoggettoSelezionatoId] = useState<number | null>(null);
  const [caricamentoDati, setCaricamentoDati] = useState(false);

  // Modale Nuovo Soggetto
  const [mostraModaleNuovo, setMostraModaleNuovo] = useState(false);
  const [nuovoNome, setNuovoNome] = useState('');
  const [nuovoCF, setNuovoCF] = useState('');
  const [nuovoStato, setNuovoStato] = useState<'CLIENTE_ATTIVO' | 'PROSPECT'>('PROSPECT');
  const [nuovaProfessione, setNuovaProfessione] = useState('');
  const [nuovoTelefono, setNuovoTelefono] = useState('');
  const [nuovaEmail, setNuovaEmail] = useState('');
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

  // Modale Nuova Offerta
  const [mostraModaleOfferta, setMostraModaleOfferta] = useState(false);
  const [nuovoRamo, setNuovoRamo] = useState('RC Auto');
  const [nuovaCompagnia, setNuovaCompagnia] = useState('');
  const [nuovoPremio, setNuovoPremio] = useState<number>(0);
  const [nuovoStatoOfferta, setNuovoStatoOfferta] = useState<'IN_TRATTATIVA' | 'VINTA' | 'PERSA'>('IN_TRATTATIVA');
  const [nuovaMotivazione, setNuovaMotivazione] = useState('');

  // 1. Ascolto Sessione Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Caricamento Dati Reali da Supabase
  const caricaSoggetti = async () => {
    setCaricamentoDati(true);
    try {
      const { data: datiSoggetti, error: errSoggetti } = await supabase
        .from('soggetti')
        .select(`
          *,
          indirizzi (*),
          offerte (*),
          legami:legami!soggetto_a_id (*)
        `)
        .order('id', { ascending: false });

      if (errSoggetti) {
        console.error('Errore caricamento:', errSoggetti);
      } else if (datiSoggetti) {
        setSoggetti(datiSoggetti);
        if (datiSoggetti.length > 0 && !soggettoSelezionatoId) {
          setSoggettoSelezionatoId(datiSoggetti[0].id);
        }
      }
    } catch (err) {
      console.error('Errore imprevisto:', err);
    } finally {
      setCaricamentoDati(false);
    }
  };

  useEffect(() => {
    if (session) {
      caricaSoggetti();
    }
  }, [session]);

  // 3. Login & Logout
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    if (error) {
      setLoginError('Credenziali non valide. Verifica email e password.');
    } else {
      setSession(data.session);
    }
    setIsSubmitting(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // 4. Salvataggio Nuovo Soggetto su DB Supabase
  const salvaNuovoSoggetto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuovoNome.trim()) return;

    setSalvataggioInCorso(true);
    const { data, error } = await supabase
      .from('soggetti')
      .insert([
        {
          nome: nuovoNome.trim(),
          codice_fiscale: nuovoCF.trim().toUpperCase(),
          stato: nuovoStato,
          professione: nuovaProfessione.trim(),
          telefono: nuovoTelefono.trim(),
          email: nuovaEmail.trim()
        }
      ])
      .select();

    if (error) {
      alert('Errore salvataggio Supabase: ' + error.message);
    } else if (data && data.length > 0) {
      const creato = data[0];
      await supabase.from('indirizzi').insert([
        { soggetto_id: creato.id, label: 'Residenza', via: 'Via / Piazza da specificare' }
      ]);

      await caricaSoggetti();
      setSoggettoSelezionatoId(creato.id);
      setMostraModaleNuovo(false);

      setNuovoNome('');
      setNuovoCF('');
      setNuovaProfessione('');
      setNuovoTelefono('');
      setNuovaEmail('');
    }
    setSalvataggioInCorso(false);
  };

  // 5. Gestione Indirizzi
  const aggiungiNuovaSede = async (soggettoId: number) => {
    const { error } = await supabase.from('indirizzi').insert([
      { soggetto_id: soggettoId, label: 'Nuova Sede / Immobile', via: 'Inserisci indirizzo completo' }
    ]);
    if (!error) caricaSoggetti();
  };

  const salvaLabelIndirizzo = async (indirizzoId: number, nuovoLabel: string) => {
    await supabase.from('indirizzi').update({ label: nuovoLabel }).eq('id', indirizzoId);
    setSoggetti(prev => prev.map(s => ({
      ...s,
      indirizzi: s.indirizzi?.map(i => i.id === indirizzoId ? { ...i, label: nuovoLabel } : i)
    })));
  };

  // 6. Salvataggio Nuova Offerta
  const salvaNuovaOfferta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soggettoSelezionatoId) return;

    const { error } = await supabase.from('offerte').insert([
      {
        soggetto_id: soggettoSelezionatoId,
        ramo: nuovoRamo,
        compagnia: nuovaCompagnia.trim(),
        premio: nuovoPremio,
        data_offerta: new Date().toISOString().split('T')[0],
        stato: nuovoStatoOfferta,
        motivazione_perdita: nuovoStatoOfferta === 'PERSA' ? nuovaMotivazione.trim() : null
      }
    ]);

    if (!error) {
      setMostraModaleOfferta(false);
      setNuovaCompagnia('');
      setNuovoPremio(0);
      setNuovaMotivazione('');
      caricaSoggetti();
    } else {
      alert('Errore salvataggio offerta: ' + error.message);
    }
  };

  // --- SCHERMATA ATTESA ---
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <Clock className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span className="text-sm">Verifica autorizzazioni Supabase...</span>
      </div>
    );
  }

  // --- SCHERMATA LOGIN BLINDATA ---
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-md">
              <Shield className="w-9 h-9" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-900">InsureCRM</h2>
          <p className="text-sm text-center text-slate-500 mb-6">Accesso Riservato Portafoglio Agenti</p>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" /> {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="agente@assicurazioni.it"
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition shadow flex items-center justify-center"
            >
              {isSubmitting ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Accedi al Gestionale
            </button>
          </form>
        </div>
      </div>
    );
  }

  const soggettoAttivo = soggetti.find(s => s.id === soggettoSelezionatoId) || soggetti[0];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none">InsureCRM</h1>
              <span className="text-[11px] text-emerald-400 font-medium">● Connesso al DB</span>
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setVistaAttiva('alert')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition ${
                vistaAttiva === 'alert' ? 'bg-blue-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center"><AlertTriangle className="w-4 h-4 mr-2.5" /> Scadenze & Alert</span>
            </button>
            <button
              onClick={() => setVistaAttiva('anagrafica')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition ${
                vistaAttiva === 'anagrafica' ? 'bg-blue-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center"><Users className="w-4 h-4 mr-2.5" /> Anagrafica 360°</span>
              <span className="bg-blue-800 text-white text-xs px-2 py-0.5 rounded-full">{soggetti.length}</span>
            </button>
            <button
              onClick={() => setVistaAttiva('offerte')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition ${
                vistaAttiva === 'offerte' ? 'bg-blue-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center"><FileText className="w-4 h-4 mr-2.5" /> Offerte & Preventivi</span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 mb-2 truncate">{session.user?.email}</div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center text-xs text-rose-400 hover:text-white hover:bg-rose-600/20 py-2 border border-slate-800 rounded-xl transition"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" /> Disconnetti
          </button>
        </div>
      </aside>

      {/* CONTENUTO PRINCIPALE */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {vistaAttiva === 'anagrafica' && 'Anagrafica 360° Clienti & Prospect'}
              {vistaAttiva === 'alert' && 'Cabina di Regia Scadenze & Alert'}
              {vistaAttiva === 'offerte' && 'Riepilogo Globale Offerte & Trattative'}
            </h2>
            <p className="text-sm text-slate-500">I dati salvati sono archiviati in modo permanente su Supabase</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={caricaSoggetti}
              disabled={caricamentoDati}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
              title="Ricarica dal Database"
            >
              <RefreshCw className={`w-4 h-4 ${caricamentoDati ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setMostraModaleNuovo(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow flex items-center transition"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nuovo Soggetto
            </button>
          </div>
        </div>

        {/* VISTA ANAGRAFICA */}
        {vistaAttiva === 'anagrafica' && (
          <div>
            {soggetti.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">Nessuna anagrafica nel database</h3>
                <p className="text-sm text-slate-500 mb-4">Inizia registrando il tuo primo cliente o potenziale lead.</p>
                <button
                  onClick={() => setMostraModaleNuovo(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl"
                >
                  Aggiungi Primo Soggetto
                </button>
              </div>
            ) : (
              <div>
                {/* Selettore Soggetti a Schede */}
                <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
                  {soggetti.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSoggettoSelezionatoId(s.id)}
                      className={`px-3.5 py-2 text-xs rounded-xl font-medium border whitespace-nowrap transition ${
                        s.id === soggettoAttivo?.id 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {s.nome} ({s.stato === 'CLIENTE_ATTIVO' ? 'Cliente' : 'Prospect'})
                    </button>
                  ))}
                </div>

                {soggettoAttivo && (
                  <div className="grid grid-cols-3 gap-6">
                    {/* Scheda Anagrafica */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{soggettoAttivo.nome}</h3>
                          <p className="text-xs text-slate-500 font-mono">{soggettoAttivo.codice_fiscale || 'CF non presente'}</p>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                          soggettoAttivo.stato === 'CLIENTE_ATTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {soggettoAttivo.stato}
                        </span>
                      </div>

                      <div className="space-y-3 text-sm text-slate-600 pt-3 border-t">
                        <div className="flex items-center"><Building2 className="w-4 h-4 mr-2 text-slate-400" /> {soggettoAttivo.professione || 'Professione non inserita'}</div>
                        <div className="flex items-center"><Phone className="w-4 h-4 mr-2 text-slate-400" /> {soggettoAttivo.telefono || 'Nessun recapito telefonico'}</div>
                        <div className="flex items-center"><Mail className="w-4 h-4 mr-2 text-slate-400" /> {soggettoAttivo.email || 'Nessun indirizzo email'}</div>
                      </div>
                    </div>

                    {/* Sedi & Indirizzi */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-2">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-900 flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-blue-600" /> Indirizzi & Sedi
                        </h3>
                        <button
                          onClick={() => aggiungiNuovaSede(soggettoAttivo.id)}
                          className="text-xs text-blue-600 font-semibold hover:underline flex items-center"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Aggiungi Sede
                        </button>
                      </div>

                      <div className="space-y-3">
                        {soggettoAttivo.indirizzi && soggettoAttivo.indirizzi.length > 0 ? (
                          soggettoAttivo.indirizzi.map(ind => (
                            <div key={ind.id} className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between">
                              <div className="flex-1 mr-4">
                                <input
                                  type="text"
                                  defaultValue={ind.label}
                                  onBlur={(e) => salvaLabelIndirizzo(ind.id, e.target.value)}
                                  className="text-xs font-bold text-blue-900 bg-transparent border-b border-dashed border-slate-400 focus:outline-none mb-1"
                                />
                                <div className="text-sm text-slate-700">{ind.via}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-400 italic">Nessun indirizzo presente.</div>
                        )}
                      </div>
                    </div>

                    {/* Sezione Offerte del Soggetto */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-3">
                      <div className="flex justify-between items-center mb-4">

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../lib/prefs';
import { deleteMyAccount, updateProfile } from '../lib/data';
import { Bubble, Button, Dialog, Field, PageHeader, Panel, Segmented, inputClass, useToast } from '../components/ui';

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut, isSample } = useAuth();
  const { t, lang, setLang, lite, setLite } = usePrefs();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState(profile?.name ?? '');
  const [target, setTarget] = useState(Number(profile?.daily_target_hrs ?? 6));
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      setNameError(t('Please enter your name.'));
      return;
    }
    setNameError(null);
    setSaving(true);
    try {
      await updateProfile(user!.id, { name: name.trim(), daily_target_hrs: target });
      await refreshProfile();
      toast(t('Saved.'));
    } catch (e) {
      console.error('Could not save settings:', e);
      toast(t('Could not save. Check your connection and try again.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount(user!.id);
      await signOut();
      navigate('/auth', { replace: true });
    } catch (e) {
      console.error('Could not delete account:', e);
      toast(t('Could not delete your account. Please try again.'), 'error');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-xl">
      <PageHeader title={t('Settings')} />

      <div className="flex flex-col gap-8">
        <Panel title={t('Your profile')}>
          <div className="flex flex-col gap-4">
            <Field label={t('Your name')} hint={t('Only you see this. Your squad sees a letter.')} error={nameError}>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <label className="block">
              <span className="flex items-baseline justify-between mb-1">
                <span className="font-medium">{t('Daily target')}</span>
                <span className="font-bold">{t('{n}h', { n: target })}</span>
              </span>
              <input type="range" className="w-full h-8" min={2} max={12} step={0.5} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
              <span className="block text-sm text-ink-soft">{t('Your plan uses this from tomorrow.')}</span>
            </label>
            <p className="text-sm text-ink-soft">{t('Exam: {exam}', { exam: profile?.exam ?? '' })}</p>
            <Button className="self-start" loading={saving} onClick={save}>
              {t('Save')}
            </Button>
          </div>
        </Panel>

        <Panel title={t('Language')}>
          <Segmented
            label={t('Language')}
            value={lang}
            onChange={setLang}
            options={[
              { value: 'en', label: 'English' },
              { value: 'hi', label: 'हिन्दी' },
            ]}
          />
          <p className="text-sm text-ink-soft mt-2">{t('New AI plans and feedback are also written in this language.')}</p>
        </Panel>

        <Panel title={t('Lite mode')}>
          <label className="flex items-start gap-3 rounded-sheet has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink">
            <input type="checkbox" className="sr-only" checked={lite} onChange={(e) => setLite(e.target.checked)} />
            <Bubble filled={lite} size={26} className="mt-0.5" />
            <span>
              <span className="block font-medium">{lite ? t('On') : t('Off')}</span>
              <span className="block text-sm text-ink-soft">
                {t('For slow connections. Charts become tables, proof photos stop loading, and animation is turned off.')}
              </span>
            </span>
          </label>
        </Panel>

        <Panel title={isSample ? t('Sample account') : t('Delete account')}>
          <p className="text-ink-soft mb-3">
            {isSample
              ? t('This account is deleted automatically after 2 days. You can delete it now if you are done.')
              : t('This permanently deletes your plans, quizzes, documents and proofs. It cannot be undone.')}
          </p>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            {t('Delete my account')}
          </Button>
        </Panel>
      </div>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t('Delete your account?')}>
        <p className="text-ink-soft mb-3">{t('Type DELETE to confirm.')}</p>
        <input className={inputClass} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label={t('Type DELETE to confirm.')} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button variant="danger" disabled={confirmText !== 'DELETE'} loading={deleting} onClick={remove}>
            {t('Delete permanently')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

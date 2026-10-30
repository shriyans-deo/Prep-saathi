import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, FileText, Loader2, PenLine, Plus, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../lib/prefs';
import { invalidate, useQuery } from '../lib/query';
import {
  deleteDocument,
  fetchDocuments,
  fetchMastery,
  fetchTomorrowQueue,
  processDocument,
  queueForTomorrow,
  startDocumentQuiz,
  suggestedToPlanTask,
  uploadDocument,
} from '../lib/data';
import { formatDay, isoDateOf } from '../lib/dates';
import { Button, Dialog, EmptyState, ErrorState, Notice, PageHeader, Panel, Skeleton, aiErrorMessage, cx, masteryBand, useToast } from '../components/ui';
import { supabase } from '../lib/supabase';
import type { LibraryDocument } from '../types/database';

const MAX_BYTES = 15 * 1024 * 1024;

type Stage = 'reading' | 'uploading' | 'mapping';

export default function LibraryPage() {
  const { user } = useAuth();
  const { t, lang } = usePrefs();
  const toast = useToast();
  const navigate = useNavigate();
  const uid = user!.id;

  const docs = useQuery(`documents:${uid}`, () => fetchDocuments(uid));
  const mastery = useQuery(`mastery:${uid}`, () => fetchMastery(uid));
  const queue = useQuery(`queue:${uid}`, () => fetchTomorrowQueue(uid));

  const [stage, setStage] = useState<Stage | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<LibraryDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addingTask, setAddingTask] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const list = useMemo(() => docs.data ?? [], [docs.data]);
  const active = list.find((d) => d.id === selectedId) ?? list[0] ?? null;
  const scoreByTopic = useMemo(
    () => new Map((mastery.data ?? []).map((m) => [m.topics.topic_name, m.score])),
    [mastery.data]
  );
  const queuedTasks = useMemo(() => new Set((queue.data ?? []).map((q) => q.task.task)), [queue.data]);

  const handleFile = async (file: File) => {
    setUploadError(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError(t('Only PDF files can be read right now.'));
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError(t('That file is larger than 15 MB. Try a smaller PDF.'));
      return;
    }

    try {
      setStage('reading');
      // pdf.js is large, so it only loads when someone actually uploads.
      const { extractTextFromPDF } = await import('../lib/pdf');
      let text = '';
      try {
        text = await extractTextFromPDF(file);
      } catch (e) {
        console.error('PDF read failed:', e);
        setUploadError(t('This PDF could not be opened. It may be damaged or password protected.'));
        return;
      }
      if (text.length < 80) {
        setUploadError(t('This PDF has no readable text, which usually means it is a scan. Scanned PDFs are not supported yet.'));
        return;
      }

      setStage('uploading');
      const id = await uploadDocument(uid, file, text);
      setSelectedId(id);
      invalidate('documents:');

      setStage('mapping');
      try {
        await processDocument(id);
      } catch (e) {
        setUploadError(aiErrorMessage(e, t));
      }
      invalidate('documents:');
    } catch (e) {
      console.error('Upload failed:', e);
      setUploadError(t('Could not upload the file. Check your connection and try again.'));
    } finally {
      setStage(null);
    }
  };

  const retry = async (doc: LibraryDocument) => {
    setRetrying(true);
    setUploadError(null);
    try {
      await processDocument(doc.id);
      invalidate('documents:');
    } catch (e) {
      setUploadError(aiErrorMessage(e, t));
    } finally {
      setRetrying(false);
    }
  };

  const takeQuiz = async (doc: LibraryDocument) => {
    setStartingQuiz(true);
    try {
      const quiz = await startDocumentQuiz(doc.id);
      navigate(`/quiz?id=${quiz.id}`);
    } catch (e) {
      toast(aiErrorMessage(e, t), 'error');
      setStartingQuiz(false);
    }
  };

  const addToTomorrow = async (doc: LibraryDocument, task: NonNullable<LibraryDocument['suggested_tasks']>[number]) => {
    setAddingTask(task.task);
    try {
      await queueForTomorrow(uid, 'document', suggestedToPlanTask(doc, task));
      invalidate('queue:');
      toast(t("Added to tomorrow's plan."));
    } catch (e) {
      console.error('Could not queue task:', e);
      toast(t('Could not save. Check your connection and try again.'), 'error');
    } finally {
      setAddingTask(null);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteDocument(confirmDelete);
      if (selectedId === confirmDelete.id) setSelectedId(null);
      invalidate('documents:');
      setConfirmDelete(null);
    } catch (e) {
      console.error('Could not delete document:', e);
      toast(t('Could not delete the document. Please try again.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openPdf = async (doc: LibraryDocument) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
    else toast(t('Could not open the file.'), 'error');
  };

  const stageLabel: Record<Stage, string> = {
    reading: t('Reading document...'),
    uploading: t('Saving your file...'),
    mapping: t('Mapping to your syllabus and building a quiz...'),
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !stage) void handleFile(file);
  };

  const overlap = active?.weak_topic_overlap ?? [];

  return (
    <div>
      <PageHeader
        title={t('Library')}
        sub={t('Upload your coaching notes. PrepSaathi reads them, finds where they meet your weak topics, and builds tasks and a quiz from what is actually in them.')}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] items-start">
        <div className="flex flex-col gap-8">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cx(
              'rounded-sheet border-[1.5px] border-dashed p-5 text-center transition-colors duration-150',
              dragging ? 'border-ink bg-tint' : 'border-print'
            )}
          >
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              aria-label={t('Choose a PDF')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void handleFile(file);
              }}
            />
            {stage ? (
              <div className="flex flex-col items-center gap-2 py-3" role="status">
                <Loader2 size={24} className="spin text-print" aria-hidden="true" />
                <p className="font-medium">{stageLabel[stage]}</p>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto text-print" aria-hidden="true" />
                <p className="font-semibold mt-2">{t('Drop a PDF here')}</p>
                <p className="text-sm text-ink-soft mb-3">{t('Up to 15 MB. Must contain selectable text.')}</p>
                <Button onClick={() => input.current?.click()}>{t('Choose a PDF')}</Button>
              </>
            )}
          </div>

          {uploadError && <Notice tone="error">{uploadError}</Notice>}

          <Panel title={t('Your documents')}>
            {docs.error && !docs.data ? (
              <ErrorState error={docs.error} onRetry={docs.refetch} />
            ) : docs.isLoading ? (
              <Skeleton className="h-16" />
            ) : list.length === 0 ? (
              <p className="text-ink-soft">{t('Nothing uploaded yet.')}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {list.map((doc) => {
                  const weakest = (doc.weak_topic_overlap ?? [])
                    .map((name) => scoreByTopic.get(name))
                    .filter((n): n is number => typeof n === 'number')
                    .sort((a, b) => a - b)[0];
                  return (
                    <li key={doc.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(doc.id)}
                        aria-pressed={active?.id === doc.id}
                        className={cx(
                          'w-full text-left flex gap-2.5 rounded-sheet border px-3 py-2.5 transition-colors duration-150',
                          active?.id === doc.id ? 'border-ink' : 'border-transparent hover:bg-tint'
                        )}
                      >
                        <FileText size={18} className="mt-0.5 flex-none text-print" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium truncate">{doc.filename}</span>
                          <span className="block text-sm text-ink-soft">
                            {formatDay(isoDateOf(doc.created_at), lang)}
                            {' · '}
                            {doc.processed
                              ? typeof weakest === 'number'
                                ? t('covers a weak topic at {n}%', { n: weakest })
                                : (doc.detected_topics?.length ?? 0) === 1
                                  ? t('1 topic found')
                                  : t('{n} topics found', { n: doc.detected_topics?.length ?? 0 })
                              : t('not processed')}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div>
          {!active ? (
            !docs.isLoading && (
              <Panel>
                <EmptyState title={t('Your first document goes here')}>
                  {t('Upload any coaching PDF to see what it covers, how it maps to your weak topics, and a quiz made from it.')}
                </EmptyState>
              </Panel>
            )
          ) : (
            <Panel>
              <div className="flex items-start gap-2 mb-3">
                <h2 className="text-lg leading-snug font-semibold min-w-0 flex-1 break-words">{active.filename}</h2>
                {!active.storage_path.startsWith('sample/') && (
                  <Button small variant="ghost" onClick={() => openPdf(active)}>
                    {t('Open PDF')}
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(active)}
                  aria-label={t('Delete document')}
                  className="flex-none w-9 h-9 inline-flex items-center justify-center rounded-sheet text-ink-soft hover:bg-[#fbe4e4] hover:text-[#8e1414]"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>

              {!active.processed ? (
                stage === 'mapping' && selectedId === active.id ? (
                  <Notice>{stageLabel.mapping}</Notice>
                ) : (
                  <Notice
                    tone="warn"
                    action={
                      <Button small variant="print" loading={retrying} onClick={() => retry(active)}>
                        {t('Try again')}
                      </Button>
                    }
                  >
                    {t('Your file is saved, but it has not been analysed yet because the AI service did not respond.')}
                  </Notice>
                )
              ) : (
                <div className="flex flex-col gap-4">
                  <p>{active.ai_summary}</p>

                  {overlap.length > 0 ? (
                    <div className="flex gap-2.5 rounded-sheet bg-tint px-3.5 py-3">
                      <AlertTriangle size={18} className="mt-0.5 flex-none text-print" aria-hidden="true" />
                      <p className="font-semibold">
                        {t('This covers {topics}, which is among your weakest topics.', { topics: overlap.join(', ') })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-ink-soft">{t('This does not overlap with your weakest topics.')}</p>
                  )}

                  {(active.detected_topics ?? []).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-print-dark mb-1.5">{t('Topics found')}</h3>
                      <ul className="flex flex-wrap gap-1.5">
                        {(active.detected_topics ?? []).map((topic) => {
                          const score = scoreByTopic.get(topic);
                          return (
                            <li key={topic} className="rounded-sheet border border-line px-2 py-0.5 text-sm">
                              {topic}
                              {typeof score === 'number' && (
                                <span className={cx('ml-1.5 font-semibold', masteryBand(score) === 'weak' && 'text-print')}>{score}%</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {(active.suggested_tasks ?? []).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-print-dark mb-1.5">{t('Suggested tasks')}</h3>
                      <ul className="divide-y divide-line border-y border-line">
                        {(active.suggested_tasks ?? []).map((task) => {
                          const queued = queuedTasks.has(task.task);
                          return (
                            <li key={task.task} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                              <div className="min-w-0 flex-1 basis-56">
                                <p className="font-medium leading-snug">{task.task}</p>
                                <p className="text-sm text-ink-soft">
                                  {t('{n} min', { n: task.minutes })}
                                  {task.why ? ` · ${task.why}` : ''}
                                </p>
                              </div>
                              {queued ? (
                                <span className="inline-flex items-center gap-1 text-sm font-medium">
                                  <Check size={16} aria-hidden="true" />
                                  {t('Added for tomorrow')}
                                </span>
                              ) : (
                                <Button small variant="print" loading={addingTask === task.task} onClick={() => addToTomorrow(active, task)}>
                                  <Plus size={14} aria-hidden="true" />
                                  {t("Add to tomorrow's plan")}
                                </Button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {(active.quiz ?? []).length >= 3 ? (
                    <Button className="w-full sm:w-auto sm:self-start" loading={startingQuiz} onClick={() => takeQuiz(active)}>
                      {!startingQuiz && <PenLine size={16} aria-hidden="true" />}
                      {t('Take the {n}-question quiz from this', { n: (active.quiz ?? []).length })}
                    </Button>
                  ) : (
                    <p className="text-sm text-ink-soft">{t('A quiz could not be made from this document.')}</p>
                  )}
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title={t('Delete this document?')}>
        <p className="text-ink-soft mb-4 break-words">
          {t('{name} and its analysis will be removed. Quizzes you already took stay in your history.', { name: confirmDelete?.filename ?? '' })}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            {t('Cancel')}
          </Button>
          <Button variant="danger" loading={deleting} onClick={remove}>
            {t('Delete')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

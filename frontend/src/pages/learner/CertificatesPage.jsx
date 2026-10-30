import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from '../../features/auth/authSlice';
import {
  fetchMyEnrollments,
  selectMyEnrollments,
  selectEnrollmentLoading,
  selectEnrollmentError,
} from '../../features/enrollments/enrollmentSlice';
import {
  fetchProgressSummary,
  selectProgressSummaryFor,
} from '../../features/lessonProgress/lessonProgressSlice';
import {
  fetchCertificateByEnrollment,
  generateCertificate,
  selectCertificateForEnrollment,
  selectGeneratingCertificate,
} from '../../features/certificates/certificateSlice';
import { downloadCertificateUrl } from '../../api/certificateApi';

function CertificateRow({ enrollment }) {
  const dispatch = useDispatch();
  const enrollmentId = enrollment.id;
  const course = enrollment.batch?.course;

  const summary = useSelector(selectProgressSummaryFor(enrollmentId));
  const certificate = useSelector(selectCertificateForEnrollment(enrollmentId));
  const generating = useSelector(selectGeneratingCertificate);

  useEffect(() => {
    dispatch(fetchProgressSummary(enrollmentId));
    dispatch(fetchCertificateByEnrollment(enrollmentId));
  }, [dispatch, enrollmentId]);

  const eligible = summary?.eligibleForCertificate ?? false;
  const percentage = summary?.completionPercentage ?? 0;

  const handleGenerate = () => {
    dispatch(generateCertificate(enrollmentId));
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {course?.title || 'Untitled course'}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {percentage}% complete
            {!eligible && ' · 80% required for certificate'}
          </p>
        </div>

        {certificate ? (
          <a
            href={downloadCertificateUrl(certificate.certificateNo)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-[var(--accent-to)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Download PDF
          </a>
        ) : eligible ? (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="shrink-0 rounded-lg bg-[var(--accent-to)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {generating ? 'Generating…' : 'Generate certificate'}
          </button>
        ) : (
          <span className="shrink-0 rounded-lg bg-[var(--surface-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
            Not yet eligible
          </span>
        )}
      </div>

      {certificate && (
        <p className="mt-2 text-[11px] font-mono text-[var(--text-muted)]">
          {certificate.certificateNo}
        </p>
      )}
    </div>
  );
}

export default function CertificatesPage() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const enrollments = useSelector(selectMyEnrollments);
  const loading = useSelector(selectEnrollmentLoading);
  const error = useSelector(selectEnrollmentError);

  useEffect(() => {
    if (user?.email) {
      dispatch(fetchMyEnrollments(user.email));
    }
  }, [dispatch, user?.email]);

  if (loading) return <div className="p-6 text-sm text-neutral-400">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;

  if (enrollments.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <p className="text-sm text-[var(--text-muted)]">
          You're not enrolled in any courses yet.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Certificates</h1>
      {enrollments.map((e) => (
        <CertificateRow key={e.id} enrollment={e} />
      ))}
    </div>
  );
}
import { query } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Award, CheckCircle } from 'lucide-react';
import PrintButton from '@/components/PrintButton';
import CertificateNameEditor from '@/components/CertificateNameEditor';

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rows = await query<any[]>(`
    SELECT c.id, c.issued_at, c.recipient_name,
           u.email, u.department,
           cr.title AS course_title,
           cr.id AS course_id
    FROM certificates c
    JOIN users u ON u.id = c.user_id
    JOIN courses cr ON cr.id = c.course_id
    WHERE c.id = ?
  `, [id]);

  if (!rows.length) notFound();

  const cert = rows[0];
  const issuedDate = new Date(cert.issued_at).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-8 print:p-0 print:bg-white">
      {/* Client Print & Navigation Buttons */}
      <PrintButton />

      {/* Certificate Container */}
      <div
        id="certificate"
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border-8 border-indigo-100 p-12 text-center relative overflow-hidden print:shadow-none print:border-4 print:border-indigo-200 print:max-w-none print:w-full print:rounded-2xl"
      >
        {/* Decorative Corners */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-600 opacity-5 rounded-br-full print:hidden" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-600 opacity-5 rounded-tl-full print:hidden" />

        {/* Company Logo Header */}
        <div className="flex justify-center mb-6">
          <div className="p-3.5 bg-white rounded-2xl shadow-sm border border-slate-100 inline-flex items-center justify-center">
            <img
              src="/jolly-clamps-logo.png"
              alt="Jolly Clamps Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>

        <p className="text-indigo-600 font-bold uppercase tracking-[0.25em] text-xs mb-1">
          Jolly Clamps Technical Training Academy
        </p>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
          Certificate of Completion
        </h1>
        <div className="h-1 w-28 bg-indigo-600 mx-auto rounded-full mb-8" />

        <p className="text-gray-500 text-lg mb-2">This certifies that</p>
        <CertificateNameEditor
          certificateId={cert.id}
          initialName={cert.recipient_name || ''}
          userEmail={cert.email}
        />
        {cert.department && (
          <p className="text-gray-600 text-sm font-semibold mb-6 uppercase tracking-widest mt-1">
            Department: {cert.department.replace(/_/g, ' ')}
          </p>
        )}

        <p className="text-gray-500 text-lg mb-3">has successfully completed the training course</p>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-8 py-5 inline-block mb-8 print:bg-white print:border-2">
          <p className="text-2xl font-bold text-gray-900">{cert.course_title}</p>
        </div>

        {/* Check Icon */}
        <div className="flex justify-center mb-8">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end text-sm text-gray-500 pt-8 border-t border-gray-100">
          <div className="text-left">
            <p className="font-medium text-gray-500 text-xs uppercase tracking-wider">Date of Issue</p>
            <p className="text-gray-800 font-semibold text-base">{issuedDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500" />
            <span className="text-xs text-gray-500 font-mono font-medium">
              ID: {cert.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-500 text-xs uppercase tracking-wider">Authorized By</p>
            <p className="text-gray-800 font-semibold text-base">Training Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
}

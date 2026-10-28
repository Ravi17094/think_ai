import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LiveClassJoin from './Liveclassjoin.jsx';
import { fetchClassInfo, joinSession } from '../../../api/liveSessionApi';

export default function LiveClassJoinPage() {
  const { classId } = useParams();
  const [classInfo, setClassInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchClassInfo(classId)
      .then((data) => {
        if (!cancelled) setClassInfo(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }
  if (!classInfo) {
    return <div className="p-6 text-sm text-neutral-400">Loading class…</div>;
  }

  return <LiveClassJoin classInfo={classInfo} onJoin={() => joinSession(classId)} />;
}
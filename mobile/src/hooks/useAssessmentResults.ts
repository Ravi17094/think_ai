// Adapted from the Desktop task archives to the current authenticated LMS API and data types.
import { useCallback, useEffect } from "react";
import { lmsApi } from "@/lms/api";
import { useLms } from "@/lms/LmsProvider";
import { useLmsResource } from "@/lms/useLmsResource";
export function useAssessmentResults(attemptId: number) {
  const { session } = useLms();
  const fetcher = useCallback(() => lmsApi.result(attemptId), [attemptId, session.token]);
  const resource = useLmsResource(fetcher);
  useEffect(() => {
    if (!resource.data || ["GRADED", "FAILED"].includes(resource.data.status)) return;
    const timer = setInterval(() => void resource.refresh(), 2000);
    return () => clearInterval(timer);
  }, [resource.data?.status, resource.refresh]);
  return resource;
}

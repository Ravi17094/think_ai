// Adapted from the Desktop task archives to the current authenticated LMS API and data types.
import { useCallback } from "react";
import { lmsApi } from "@/lms/api";
import { useLms } from "@/lms/LmsProvider";
import { useLmsResource } from "@/lms/useLmsResource";
export function useCertificate(certificateId: number) {
  const { session } = useLms();
  const fetcher = useCallback(() => lmsApi.certificate(certificateId), [certificateId, session.token]);
  return useLmsResource(fetcher);
}

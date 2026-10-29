// Adapted from the Desktop task archives to the current authenticated LMS API and data types.
import { useCallback } from "react";
import { lmsApi } from "@/lms/api";
import { useLms } from "@/lms/LmsProvider";
import { useLmsResource } from "@/lms/useLmsResource";
import type { AnalyticsBucket } from "@/lms/types";
export function useAnalytics(from: string, to: string, bucket: AnalyticsBucket) {
  const { session } = useLms();
  const key = `${from}|${to}|${bucket}|${session.token}`;
  const fetcher = useCallback(async () => ({ key, value: await lmsApi.analytics(from, to, bucket) }), [key]);
  const resource = useLmsResource(fetcher);
  return { ...resource, data: !resource.loading && !resource.error && resource.data?.key === key ? resource.data.value : null };
}

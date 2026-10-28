export interface Thread {
  id: string;
  title: string;
  replies: number;
  author: string;
  thumbnailUrl?: string;
}

export interface ThreadsPage {
  threads: Thread[];
  hasMore?: boolean;
  total?: number;
}

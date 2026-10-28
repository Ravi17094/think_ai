import { getCourses } from './courseApi';
import { getModules } from './moduleApi';
import { getAllLessons } from './lessonApi';


export async function searchCourses(query, page = 1, limit = 10) {
  const res = await getCourses(query, page, limit);
  return res.data.data;
}

export async function searchModules(query) {
  const res = await getModules();
  const all = res.data.data || [];
  const q = query.toLowerCase();
  return all.filter((m) => m.title?.toLowerCase().includes(q));
}

export async function searchLessons(query) {
  const res = await getAllLessons();
  const all = res.data.data || [];
  const q = query.toLowerCase();
  return all.filter((l) => l.title?.toLowerCase().includes(q));
}
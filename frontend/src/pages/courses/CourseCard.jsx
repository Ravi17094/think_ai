import React from 'react';

const TECH_IMAGES = [
  { keywords: ['typescript', 'type script', 'ts'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg' },
  { keywords: ['javascript', 'java script'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' },
  { keywords: ['node'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg' },
  { keywords: ['react'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg' },
  { keywords: ['python'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
  { keywords: ['java'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg' },
  { keywords: ['c++', 'cpp'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg' },
  { keywords: ['c#', 'csharp'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg' },
  { keywords: [' c ', 'c programming'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/c/c-original.svg' },
  { keywords: ['angular'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg' },
  { keywords: ['vue'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg' },
  { keywords: ['mongodb', 'mongo'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg' },
  { keywords: ['sql'], img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg' },
];

const THUMB_GRADIENTS = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'];
function getThumbGradientClass(id = 0) {
  const index = typeof id === 'number' ? id : String(id).charCodeAt(0) || 0;
  return THUMB_GRADIENTS[index % THUMB_GRADIENTS.length];
}

function getFallbackImage(title, category) {
  const haystack = ` ${(title || '')} ${(category || '')} `.toLowerCase();
  for (const entry of TECH_IMAGES) {
    if (entry.keywords.some((kw) => haystack.includes(kw))) {
      return entry.img;
    }
  }
  return null;
}

export default function CourseCard({ course, isAdmin, onEdit, onDelete, onView }) {
  const imageSrc = course.thumbnail || getFallbackImage(course.title, course.category);
  const gradientClass = getThumbGradientClass(course.id || course._id || 0);
  const isLocked = course.isLocked || course.price > 0;

  return (
    <div
      onClick={() => onView && onView(course)}
      className="cursor-pointer w-full group transition-all duration-500"
      style={{ display: 'inline-block' }}
    >
      {/* Outer Glow Border Wrapper */}
      <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-purple-500/40 via-cyan-500/10 to-transparent shadow-[0_0_20px_rgba(147,51,235,0.06)] group-hover:shadow-[0_0_30px_rgba(147,51,235,0.2)] transition-all duration-500">

        {/* Light White / Off-White Card Container */}
        <div className="course-card bg-white text-slate-900 rounded-[22px] overflow-hidden flex flex-col h-full relative border border-slate-200 shadow-lg">

          {/* Top Thumbnail Section with fitted image & soft background */}
          <div className={`course-thumb ${gradientClass} relative h-48 w-full overflow-hidden flex items-center justify-center p-4 bg-slate-50 border-b border-slate-100`}>

            {imageSrc ? (
              <img
                src={imageSrc}
                alt={course.title}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-md"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="flex items-center justify-center font-mono text-xl font-bold text-slate-700">&lt;/&gt;</div>
            )}

            {/* Duration Badge */}
            {course.duration && (
              <span className="absolute bottom-2 left-3 z-10 text-[10px] text-slate-700 font-medium bg-white/90 px-2.5 py-1 rounded-md backdrop-blur-sm border border-slate-200 shadow-sm">
                <i className="fa-regular fa-clock mr-1 text-purple-600"></i>{course.duration}
              </span>
            )}

            {/* Status Badge */}
            <span className="absolute top-3 right-3 z-25 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase tracking-wider shadow-sm">
              {course.status || 'ACTIVE'}
            </span>

            {/* Trendy Lock Card Overlay Badge */}
            {isLocked && (
              <span className="absolute top-3 left-3 z-25 bg-purple-950/90 border border-purple-500/30 backdrop-blur-md text-purple-200 px-2.5 py-1 text-[9px] font-extrabold rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-md">
                <i className="fa-solid fa-lock text-[9px]"></i> Pro Locked
              </span>
            )}
          </div>

          {/* Card Body */}
          <div className="course-body p-5 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              {course.category && (
                <div className="course-cat text-purple-600 text-xs font-bold tracking-wide uppercase">
                  {course.category}
                </div>
              )}
              <div className="course-title text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-2">
                {course.title}
              </div>

              {/* Instructor + Updated date, matches reference: "Ananya Rao · Updated Jul 2026" */}
              <div className="course-meta text-xs text-slate-500">
                {course.instructorName}
                {course.instructorName && course.updatedAt && ' · '}
                {course.updatedAt &&
                  `Updated ${new Date(course.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}`}
              </div>

              {course.instructorDetails && (
                <div className="text-[11px] text-slate-400 line-clamp-1">
                  {course.instructorDetails}
                </div>
              )}

              {/* Rating: bold purple number, gray count, no star — matches reference */}
              {course.rating && (
                <div className="course-rating text-xs pt-0.5">
                  <span className="text-purple-600 font-bold">{course.rating}</span>{' '}
                  <span className="text-slate-400 font-normal">({(course.ratingsCount || 0).toLocaleString('en-IN')} ratings)</span>
                </div>
              )}
            </div>

            {/* Bottom Price Bar (Full White Footer Container) */}
            <div className="course-foot pt-3.5 pb-3 px-4 -mx-5 -mb-5 bg-slate-100 text-slate-900 border-t border-slate-200 rounded-b-[20px] flex items-center justify-between">
              <div className="price flex items-baseline gap-2">
                {course.originalPrice && (
                  <span className="old text-xs text-slate-400 line-through font-mono">
                    {typeof course.originalPrice === 'number' ? `₹${course.originalPrice.toLocaleString('en-IN')}` : course.originalPrice}
                  </span>
                )}
                <span className="font-mono text-lg font-black text-slate-900">
                  {typeof course.price === 'number' ? `₹${course.price.toLocaleString('en-IN')}` : (course.price || 'Free')}
                </span>
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                {isAdmin ? (
                  <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
                    <button onClick={() => onView(course)} className="text-purple-700 hover:underline cursor-pointer">View</button>
                    <button onClick={() => onEdit(course)} className="text-amber-700 hover:underline cursor-pointer">Edit</button>
                    <button onClick={() => onDelete(course.id || course._id)} className="text-rose-600 hover:underline cursor-pointer">Delete</button>
                  </div>
                ) : (
                  <button
                    onClick={() => onView(course)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{isLocked ? 'Unlock' : 'View'}</span>
                    <i className={`fa-solid ${isLocked ? 'fa-lock' : 'fa-arrow-right'} text-[9px]`}></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
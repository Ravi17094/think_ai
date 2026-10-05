import useRBACMatrix from '../../hooks/useRBACMatrix';

export default function RBACMatrix() {
  const {
    roles, permissions, grants, loading, saving, error, inheritance,
    lastSaved, isDirty, changes, toggle, discard, save,
  } = useRBACMatrix();

  if (loading) return <div className="p-6 text-gray-500 dark:text-gray-400">Loading RBAC matrix…</div>;
  if (error) return <div className="p-6 text-red-600 dark:text-red-400 font-medium">Error: {error}</div>;
  if (!roles || roles.length === 0) return <div className="p-6 text-gray-500 dark:text-gray-400">No roles configured.</div>;
  
  return (
    <div className="p-4 sm:p-6 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
          RBAC Permission Matrix
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Toggle direct grants or revocations. Route guards follow the role hierarchy shown below.
        </p>
        {inheritance.length > 0 && (
          <p className="mt-3 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
            Guard inheritance: {inheritance.join(' → ')}
          </p>
        )}
        {lastSaved && (
          <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
            {lastSaved}
          </p>
        )}
        {error && <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300" role="alert">{error}</p>}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <span className={`text-sm font-medium ${isDirty ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'}`}>
          {isDirty ? `${changes.length} unsaved change${changes.length === 1 ? '' : 's'}` : 'All changes saved'}
        </span>
        <button type="button" onClick={discard} disabled={!isDirty || saving} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600">Discard</button>
        <button type="button" onClick={save} disabled={!isDirty || saving} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button>
      </div>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">Changes are staged locally until saved. Checked boxes represent direct grants; route guard inheritance is shown above.</p>

      <div className="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-[#3f3f3f] rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#212121]/50 border-b border-gray-200 dark:border-[#3f3f3f] text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider">
                <th className="px-6 py-4 font-semibold">Permission</th>
                {roles.map((role) => (
                  <th key={role} className="px-6 py-4 font-semibold text-center text-gray-900 dark:text-white">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3f3f3f]">
              {permissions.map((perm) => (
                <tr key={perm} className="hover:bg-gray-50/50 dark:hover:bg-[#3f3f3f]/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">{perm}</td>
                  {roles.map((role) => {
                    const direct = (grants[role] || []).includes(perm);
                    return (
                      <td key={role + perm} className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={direct}
                          disabled={saving}
                          onChange={() => toggle(role, perm)}
                          aria-label={`${direct ? 'Revoke' : 'Grant'} ${perm} for ${role}`}
                          className={`h-5 w-5 rounded border-gray-300 text-purple-600 transition duration-200 ease-out focus:ring-purple-500 checked:scale-110 dark:border-[#3f3f3f] dark:bg-[#212121] ${saving ? 'cursor-wait opacity-50' : 'cursor-pointer'
                            }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

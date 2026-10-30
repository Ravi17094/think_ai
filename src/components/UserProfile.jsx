export default function UserProfile({ user }) {
  if (!user) {
    return null;
  }

  return (
    <a className="user-profile" href={`#/user/${user.username}`} title={`View ${user.displayName}'s profile`}>
      <img
        className="user-avatar"
        src={user.avatar}
        alt={`${user.displayName} avatar`}
        width="36"
        height="36"
        loading="lazy"
      />
      <span className="user-meta">
        <span className="user-name">{user.displayName}</span>
        <span className="user-role">{user.role}</span>
      </span>
    </a>
  );
}

const defaultAnnouncement =
  "Nationwide delivery across Nigeria • New football jerseys added weekly";

export function AnnouncementBar({
  message = defaultAnnouncement,
}: {
  message?: string;
}) {
  return (
    <div className="bg-neutral-950 px-4 py-2 text-center text-xs leading-5 text-white">
      <p>{message}</p>
    </div>
  );
}

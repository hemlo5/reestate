export default function BrokerLeadsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
      <div className="h-8 w-52 rounded-xl bg-[#F2F4F8]" />
      <div className="h-28 rounded-2xl bg-[#F7F8FA] border border-[#E6E9EF]" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-2xl bg-[#F7F8FA] border border-[#E6E9EF]"
          />
        ))}
      </div>
    </div>
  );
}

export default function BrokerDashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-8">
      <div className="h-10 w-64 rounded-xl bg-[#F2F4F8]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-[#F7F8FA] border border-[#E6E9EF]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 h-72 rounded-2xl bg-[#F7F8FA] border border-[#E6E9EF]" />
        <div className="lg:col-span-5 h-72 rounded-2xl bg-[#F7F8FA] border border-[#E6E9EF]" />
      </div>
    </div>
  );
}

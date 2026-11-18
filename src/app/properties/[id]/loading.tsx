export default function PropertyDetailsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
      <div className="h-5 w-40 rounded-lg bg-[#F2F4F8]" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="aspect-[16/10] rounded-3xl bg-[#F2F4F8]" />
          <div className="h-44 rounded-2xl bg-[#F7F8FA] border border-[#E6E9EF]" />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <div className="h-72 rounded-3xl bg-[#F7F8FA] border border-[#E6E9EF]" />
        </div>
      </div>
    </div>
  );
}

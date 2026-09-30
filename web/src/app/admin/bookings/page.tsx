import { BookingsTable } from "@/components/admin/bookings-table";

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const { status } = await searchParams;
  return <BookingsTable initialStatus={typeof status === "string" ? status : "all"} />;
}

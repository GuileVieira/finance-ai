import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.isSuperAdmin) {
    redirect('/');
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-950 text-slate-50">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mb-8 flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Painel Admin Global
            </h1>
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

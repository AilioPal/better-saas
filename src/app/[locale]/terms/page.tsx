import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, FileText, Mail, RefreshCw, Shield, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

interface TermsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TermsPageContent />;
}

function TermsPageContent() {
  const t = useTranslations('legal.terms');

  const currentDate = new Date().toLocaleDateString();

  const sections = [
    { key: 'acceptance', icon: Shield },
    { key: 'useOfService', icon: Users },
    { key: 'userAccounts', icon: FileText },
    { key: 'privacy', icon: Shield },
    { key: 'termination', icon: AlertTriangle },
    { key: 'changes', icon: RefreshCw },
    { key: 'contact', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <Badge variant="secondary" className="text-xs">
              Legal Document
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="mb-4 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text font-bold text-4xl text-transparent md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-lg text-muted-foreground">
            {t('introduction')}
          </p>
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <RefreshCw className="h-4 w-4" />
            {t('lastUpdated', { date: currentDate })}
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.key}
                className="group border-0 bg-white/70 shadow-md backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="font-semibold text-gray-900 text-xl">
                        {t(`${section.key}.title`)}
                      </CardTitle>
                      <div className="mt-1 h-0.5 w-12 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-base text-gray-700 leading-relaxed">
                    {t(`${section.key}.content`)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="rounded-2xl border-0 bg-white/70 p-8 shadow-md backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900 text-lg">Need Help?</h3>
            </div>
            <p className="mb-6 text-gray-600">
              If you have any questions about these terms, please don't hesitate to contact us.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              <Link href="/privacy">
                <Button variant="default" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Privacy Policy
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "manager-oceanman"

interface TestEmailProps {
  appName?: string
  lang?: string
}

const t = (lang: string | undefined, en: string, es: string) =>
  lang === 'es' ? es : en

const TestEmail = ({ appName, lang }: TestEmailProps) => (
  <Html lang={lang || 'es'} dir="ltr">
    <Head />
    <Preview>{t(lang, 'Test email', 'Correo de prueba')} — {appName || SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={headerLabel}>{appName || SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>
          {t(lang, 'Test Email', 'Correo de Prueba')}
        </Heading>

        <Text style={text}>
          {t(
            lang,
            `This is a test email from ${appName || SITE_NAME}. If you received this, your email configuration is working correctly.`,
            `Este es un correo de prueba de ${appName || SITE_NAME}. Si has recibido este mensaje, la configuración de correo funciona correctamente.`
          )}
        </Text>

        <Text style={footer}>
          {t(
            lang,
            'This is an automated notification. Please do not reply to this email.',
            'Esta es una notificación automática. Por favor no respondas a este correo.'
          )}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TestEmail,
  subject: (data: Record<string, any>) =>
    data.lang === 'es'
      ? `Correo de prueba — ${data.appName || SITE_NAME}`
      : `Test email — ${data.appName || SITE_NAME}`,
  displayName: 'Test email',
  previewData: {
    appName: 'OceanMan',
    lang: 'es',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '520px', margin: '0 auto' }
const headerSection = { marginBottom: '24px' }
const headerLabel = {
  fontSize: '11px',
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '1.5px',
  color: '#0066cc',
  margin: '0',
}
const h1 = {
  fontSize: '20px',
  fontWeight: '600' as const,
  color: '#111827',
  margin: '0 0 12px',
  lineHeight: '1.3',
}
const text = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const footer = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '0',
  fontStyle: 'italic' as const,
}

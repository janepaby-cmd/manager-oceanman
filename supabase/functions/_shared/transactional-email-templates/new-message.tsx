import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "OceanMan"

interface NewMessageProps {
  recipientName?: string
  senderName?: string
  subject?: string
  bodyPreview?: string
  projectName?: string
  messageUrl?: string
  lang?: string
}

const t = (lang: string) => ({
  preview: lang === 'es' ? 'Tienes un nuevo mensaje' : 'You have a new message',
  title: lang === 'es' ? 'Nuevo mensaje' : 'New message',
  from: lang === 'es' ? 'De' : 'From',
  subject: lang === 'es' ? 'Asunto' : 'Subject',
  project: lang === 'es' ? 'Proyecto' : 'Project',
  viewMessage: lang === 'es' ? 'Ver mensaje' : 'View message',
  footer: lang === 'es'
    ? `Este es un mensaje automático de ${SITE_NAME}. No responda a este correo.`
    : `This is an automated message from ${SITE_NAME}. Do not reply to this email.`,
  greeting: (name: string) => lang === 'es' ? `Hola ${name},` : `Hi ${name},`,
  intro: lang === 'es'
    ? 'Has recibido un nuevo mensaje en la plataforma.'
    : 'You have received a new message on the platform.',
})

const NewMessageEmail = ({
  recipientName = '',
  senderName = '',
  subject = '',
  bodyPreview = '',
  projectName = '',
  messageUrl = '#',
  lang = 'es',
}: NewMessageProps) => {
  const i = t(lang)
  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{i.preview}: {subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{i.title}</Heading>
          <Text style={text}>{i.greeting(recipientName || 'Usuario')}</Text>
          <Text style={text}>{i.intro}</Text>

          <Section style={infoBox}>
            <Text style={infoRow}><strong>{i.from}:</strong> {senderName}</Text>
            <Text style={infoRow}><strong>{i.subject}:</strong> {subject}</Text>
            {projectName && <Text style={infoRow}><strong>{i.project}:</strong> {projectName}</Text>}
          </Section>

          {bodyPreview && (
            <Section style={previewBox}>
              <Text style={previewText}>{bodyPreview}...</Text>
            </Section>
          )}

          <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
            <Button style={button} href={messageUrl}>
              {i.viewMessage}
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>{i.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NewMessageEmail,
  subject: (data: Record<string, any>) => {
    const lang = data.lang || 'es'
    return lang === 'es'
      ? `Nuevo mensaje: ${data.subject || ''}`
      : `New message: ${data.subject || ''}`
  },
  displayName: 'New message notification',
  previewData: {
    recipientName: 'Juan Pérez',
    senderName: 'Admin',
    subject: 'Actualización del proyecto',
    bodyPreview: 'Se ha actualizado el estado del proyecto para la próxima fase...',
    projectName: 'Proyecto Alpha',
    messageUrl: 'https://example.com/dashboard/messages/123',
    lang: 'es',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a1a', margin: '0 0 20px', letterSpacing: '-0.3px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const infoBox = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const infoRow = { fontSize: '13px', color: '#333', margin: '0 0 6px', lineHeight: '1.5' }
const previewBox = { borderLeft: '3px solid #0066cc', paddingLeft: '16px', margin: '0 0 20px' }
const previewText = { fontSize: '13px', color: '#666', fontStyle: 'italic' as const, margin: '0', lineHeight: '1.5' }
const button = {
  backgroundColor: '#0066cc', color: '#ffffff', padding: '12px 28px', borderRadius: '6px',
  fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' as const,
}
const hr = { borderColor: '#eee', margin: '30px 0 20px' }
const footer = { fontSize: '11px', color: '#999', margin: '0', lineHeight: '1.4' }

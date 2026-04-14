import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "manager-oceanman"

interface ExternalItemNotificationProps {
  projectName?: string
  phaseName?: string
  itemTitle?: string
  itemDescription?: string
  itemStatus?: string
  recipientName?: string
  additionalMessage?: string
  senderName?: string
  lang?: string
}

const t = (lang: string | undefined, en: string, es: string) =>
  lang === 'es' ? es : en

const ExternalItemNotificationEmail = ({
  projectName, phaseName, itemTitle, itemDescription,
  itemStatus, recipientName, additionalMessage, senderName, lang,
}: ExternalItemNotificationProps) => (
  <Html lang={lang || 'es'} dir="ltr">
    <Head />
    <Preview>
      {t(lang, 'Item info', 'Info del ítem')}: {itemTitle || ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={headerLabel}>{SITE_NAME}</Text>
        </Section>

        {recipientName && (
          <Text style={greeting}>
            {t(lang, `Hi ${recipientName},`, `Hola ${recipientName},`)}
          </Text>
        )}

        <Heading style={h1}>
          {t(lang, 'Item Information', 'Información del Ítem')}
        </Heading>

        <Section style={detailsCard}>
          <Text style={detailRow}>
            <span style={detailLabel}>{t(lang, 'Project', 'Proyecto')}:</span>{' '}
            {projectName || '—'}
          </Text>
          <Text style={detailRow}>
            <span style={detailLabel}>{t(lang, 'Phase', 'Fase')}:</span>{' '}
            {phaseName || '—'}
          </Text>
          <Text style={detailRow}>
            <span style={detailLabel}>{t(lang, 'Item', 'Ítem')}:</span>{' '}
            {itemTitle || '—'}
          </Text>
          <Hr style={divider} />
          <Text style={detailRow}>
            <span style={detailLabel}>{t(lang, 'Status', 'Estado')}:</span>{' '}
            <span style={{ color: itemStatus === 'Completed' || itemStatus === 'Completado' ? '#16a34a' : '#ea580c', fontWeight: 600 }}>
              {itemStatus || '—'}
            </span>
          </Text>
        </Section>

        {itemDescription && (
          <Section style={{ marginBottom: '24px' }}>
            <Text style={{ ...detailLabel, fontSize: '14px', margin: '0 0 8px' }}>
              {t(lang, 'Description', 'Descripción')}
            </Text>
            <Text style={text}>{itemDescription}</Text>
          </Section>
        )}

        {additionalMessage && (
          <Section style={messageSection}>
            <Text style={messageSectionTitle}>
              {t(lang, 'Additional Message', 'Mensaje Adicional')}
            </Text>
            <Text style={text}>{additionalMessage}</Text>
          </Section>
        )}

        {senderName && (
          <Text style={text}>
            {t(lang, `Sent by ${senderName}`, `Enviado por ${senderName}`)}
          </Text>
        )}

        <Text style={footer}>
          {t(
            lang,
            'This is an informational email sent manually.',
            'Este es un correo informativo enviado manualmente.'
          )}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ExternalItemNotificationEmail,
  subject: (data: Record<string, any>) =>
    data.lang === 'es'
      ? `Info del ítem: ${data.itemTitle || 'Sin título'} — ${data.projectName || ''}`
      : `Item info: ${data.itemTitle || 'Untitled'} — ${data.projectName || ''}`,
  displayName: 'External item notification',
  previewData: {
    projectName: 'Proyecto Demo',
    phaseName: 'Fase 1 - Planificación',
    itemTitle: 'Revisión de documentación',
    itemDescription: 'Revisar y aprobar la documentación del proyecto.',
    itemStatus: 'Pendiente',
    recipientName: 'Carlos López',
    additionalMessage: 'Por favor revise los documentos adjuntos.',
    senderName: 'Juan García',
    lang: 'es',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '520px', margin: '0 auto' }
const headerSection = { marginBottom: '24px' }
const headerLabel = {
  fontSize: '11px', fontWeight: '600' as const, textTransform: 'uppercase' as const,
  letterSpacing: '1.5px', color: '#0066cc', margin: '0',
}
const greeting = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const h1 = { fontSize: '20px', fontWeight: '600' as const, color: '#111827', margin: '0 0 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 24px' }
const detailsCard = {
  backgroundColor: '#f9fafb', borderRadius: '8px', padding: '20px',
  marginBottom: '24px', border: '1px solid #e5e7eb',
}
const detailRow = { fontSize: '13px', color: '#374151', margin: '0 0 8px', lineHeight: '1.5' }
const detailLabel = { fontWeight: '600' as const, color: '#111827' }
const divider = { borderColor: '#e5e7eb', margin: '12px 0' }
const messageSection = {
  backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '16px 20px',
  marginBottom: '24px', border: '1px solid #bae6fd',
}
const messageSectionTitle = { fontSize: '13px', fontWeight: '600' as const, color: '#0369a1', margin: '0 0 8px' }
const footer = { fontSize: '11px', color: '#9ca3af', margin: '0', fontStyle: 'italic' as const }

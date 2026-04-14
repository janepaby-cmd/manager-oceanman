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
            <span style={detailValue}>{projectName || '—'}</span>
          </Text>
          <Text style={detailRow}>
            <span style={detailLabel}>{t(lang, 'Phase', 'Fase')}:</span>{' '}
            <span style={detailValue}>{phaseName || '—'}</span>
          </Text>
          <Text style={detailRow}>
            <span style={detailLabel}>{t(lang, 'Item', 'Ítem')}:</span>{' '}
            <span style={detailValue}>{itemTitle || '—'}</span>
          </Text>
          <Hr style={divider} />
          <Text style={detailRow}>
            <span style={detailLabel}>{t(lang, 'Status', 'Estado')}:</span>{' '}
            <span style={{ fontSize: '16px', fontWeight: 700, color: itemStatus === 'Completed' || itemStatus === 'Completado' ? '#16a34a' : '#ea580c' }}>
              {itemStatus || '—'}
            </span>
          </Text>
        </Section>

        {itemDescription && (
          <Section style={descriptionSection}>
            <Text style={sectionTitle}>
              {t(lang, 'Description', 'Descripción')}
            </Text>
            <Text style={descriptionText}>{itemDescription}</Text>
          </Section>
        )}

        {additionalMessage && (
          <Section style={messageSection}>
            <Text style={messageSectionTitle}>
              {t(lang, 'Additional Message', 'Mensaje Adicional')}
            </Text>
            <Text style={messageText}>{additionalMessage}</Text>
          </Section>
        )}

        {senderName && (
          <Text style={senderText}>
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

const main = { backgroundColor: '#f4f4f5', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '40px 32px', maxWidth: '680px', margin: '24px auto', borderRadius: '12px', border: '1px solid #e5e7eb' }
const headerSection = { marginBottom: '28px', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }
const headerLabel = {
  fontSize: '13px', fontWeight: '700' as const, textTransform: 'uppercase' as const,
  letterSpacing: '2px', color: '#0066cc', margin: '0',
}
const greeting = { fontSize: '16px', color: '#374151', lineHeight: '1.6', margin: '0 0 20px' }
const h1 = { fontSize: '26px', fontWeight: '700' as const, color: '#111827', margin: '0 0 20px', lineHeight: '1.3' }
const detailsCard = {
  backgroundColor: '#f9fafb', borderRadius: '10px', padding: '24px 28px',
  marginBottom: '28px', border: '1px solid #e5e7eb',
}
const detailRow = { fontSize: '15px', color: '#374151', margin: '0 0 12px', lineHeight: '1.6' }
const detailLabel = { fontWeight: '700' as const, color: '#111827', fontSize: '15px' }
const detailValue = { fontSize: '15px', color: '#374151' }
const divider = { borderColor: '#e5e7eb', margin: '16px 0' }
const descriptionSection = { marginBottom: '28px' }
const sectionTitle = { fontSize: '16px', fontWeight: '700' as const, color: '#111827', margin: '0 0 10px' }
const descriptionText = { fontSize: '15px', color: '#4b5563', lineHeight: '1.7', margin: '0' }
const messageSection = {
  backgroundColor: '#eff6ff', borderRadius: '10px', padding: '20px 24px',
  marginBottom: '28px', borderLeft: '4px solid #3b82f6',
}
const messageSectionTitle = { fontSize: '15px', fontWeight: '700' as const, color: '#1d4ed8', margin: '0 0 10px' }
const messageText = { fontSize: '15px', color: '#1e40af', lineHeight: '1.7', margin: '0' }
const senderText = { fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 28px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '0', fontStyle: 'italic' as const, borderTop: '1px solid #e5e7eb', paddingTop: '16px' }

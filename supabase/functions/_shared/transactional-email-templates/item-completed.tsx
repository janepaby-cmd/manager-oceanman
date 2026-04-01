import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "manager-oceanman"

interface AttachedFile {
  name?: string
  url?: string
  extension?: string
}

interface ItemCompletedProps {
  projectName?: string
  phaseName?: string
  itemTitle?: string
  completedBy?: string
  completedAt?: string
  lang?: string
  attachedFiles?: AttachedFile[]
}

const t = (lang: string | undefined, en: string, es: string) =>
  lang === 'es' ? es : en

const ItemCompletedEmail = ({
  projectName,
  phaseName,
  itemTitle,
  completedBy,
  completedAt,
  lang,
  attachedFiles,
}: ItemCompletedProps) => (
  <Html lang={lang || 'es'} dir="ltr">
    <Head />
    <Preview>
      {t(lang, 'Item completed', 'Ítem completado')}: {itemTitle || ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={headerLabel}>{SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>
          {t(lang, 'Item Completed', 'Ítem Completado')}
        </Heading>

        <Text style={text}>
          {t(
            lang,
            'An item has been marked as completed in a project you are assigned to.',
            'Un ítem ha sido marcado como completado en un proyecto al que estás asignado.'
          )}
        </Text>

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
            <span style={detailLabel}>{t(lang, 'Completed by', 'Completado por')}:</span>{' '}
            {completedBy || '—'}
          </Text>
          <Text style={detailRow}>
            <span style={detailLabel}>{t(lang, 'Date', 'Fecha')}:</span>{' '}
            {completedAt || '—'}
          </Text>
        </Section>

        {attachedFiles && attachedFiles.length > 0 && (
          <Section style={filesSection}>
            <Text style={filesSectionTitle}>
              {t(lang, 'Attached Files', 'Archivos Adjuntos')} ({attachedFiles.length})
            </Text>
            {attachedFiles.map((file, index) => (
              <Text key={index} style={fileRow}>
                📎{' '}
                {file.url ? (
                  <Link href={file.url} style={fileLink}>
                    {file.name || t(lang, 'File', 'Archivo')}
                  </Link>
                ) : (
                  file.name || t(lang, 'File', 'Archivo')
                )}
                {file.extension && (
                  <span style={fileExt}> .{file.extension}</span>
                )}
              </Text>
            ))}
          </Section>
        )}

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
  component: ItemCompletedEmail,
  subject: (data: Record<string, any>) =>
    data.lang === 'es'
      ? `Ítem completado: ${data.itemTitle || 'Sin título'}`
      : `Item completed: ${data.itemTitle || 'Untitled'}`,
  displayName: 'Item completed notification',
  previewData: {
    projectName: 'Proyecto Demo',
    phaseName: 'Fase 1 - Planificación',
    itemTitle: 'Revisión de documentación',
    completedBy: 'Juan García',
    completedAt: '29/03/2026 15:30',
    lang: 'es',
    attachedFiles: [
      { name: 'documento-revision.pdf', url: 'https://example.com/doc.pdf', extension: 'pdf' },
      { name: 'foto-obra.jpg', url: 'https://example.com/foto.jpg', extension: 'jpg' },
    ],
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
const detailsCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '24px',
  border: '1px solid #e5e7eb',
}
const detailRow = {
  fontSize: '13px',
  color: '#374151',
  margin: '0 0 8px',
  lineHeight: '1.5',
}
const detailLabel = {
  fontWeight: '600' as const,
  color: '#111827',
}
const divider = {
  borderColor: '#e5e7eb',
  margin: '12px 0',
}
const filesSection = {
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '24px',
  border: '1px solid #bae6fd',
}
const filesSectionTitle = {
  fontSize: '13px',
  fontWeight: '600' as const,
  color: '#0369a1',
  margin: '0 0 10px',
}
const fileRow = {
  fontSize: '13px',
  color: '#374151',
  margin: '0 0 6px',
  lineHeight: '1.5',
}
const fileLink = {
  color: '#0066cc',
  textDecoration: 'underline' as const,
}
const fileExt = {
  fontSize: '11px',
  color: '#9ca3af',
  textTransform: 'uppercase' as const,
}
const footer = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '0',
  fontStyle: 'italic' as const,
}

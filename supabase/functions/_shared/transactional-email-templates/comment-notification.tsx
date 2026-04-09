import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "manager-oceanman"

interface CommentNotificationProps {
  projectName?: string
  phaseName?: string
  itemTitle?: string
  commentAuthor?: string
  commentBody?: string
  isReply?: boolean
  parentAuthor?: string
  lang?: string
  itemUrl?: string
}

const t = (lang: string | undefined, en: string, es: string) =>
  lang === 'es' ? es : en

const CommentNotificationEmail = ({
  projectName,
  phaseName,
  itemTitle,
  commentAuthor,
  commentBody,
  isReply,
  parentAuthor,
  lang,
  itemUrl,
}: CommentNotificationProps) => (
  <Html lang={lang || 'es'} dir="ltr">
    <Head />
    <Preview>
      {isReply
        ? t(lang, `${commentAuthor} replied to a comment`, `${commentAuthor} respondió a un comentario`)
        : t(lang, `${commentAuthor} commented on an item`, `${commentAuthor} comentó en un ítem`)}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={headerLabel}>{SITE_NAME}</Text>
        </Section>

        <Heading style={h1}>
          {isReply
            ? t(lang, 'New Reply on Item', 'Nueva Respuesta en Ítem')
            : t(lang, 'New Comment on Item', 'Nuevo Comentario en Ítem')}
        </Heading>

        <Text style={text}>
          {isReply
            ? t(
                lang,
                `${commentAuthor || 'A user'} replied to ${parentAuthor ? `${parentAuthor}'s comment` : 'a comment'} on an item you are following.`,
                `${commentAuthor || 'Un usuario'} respondió al comentario de ${parentAuthor || 'un usuario'} en un ítem de tu proyecto.`
              )
            : t(
                lang,
                `${commentAuthor || 'A user'} posted a new comment on an item in a project you are assigned to.`,
                `${commentAuthor || 'Un usuario'} ha publicado un nuevo comentario en un ítem de un proyecto al que estás asignado.`
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
            <span style={detailLabel}>{t(lang, 'Author', 'Autor')}:</span>{' '}
            {commentAuthor || '—'}
          </Text>
        </Section>

        <Section style={commentCard}>
          <Text style={commentLabel}>
            {isReply ? t(lang, 'Reply', 'Respuesta') : t(lang, 'Comment', 'Comentario')}:
          </Text>
          <Text style={commentText}>
            {commentBody || '—'}
          </Text>
        </Section>

        {itemUrl && (
          <Section style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
            <Button href={itemUrl} style={btnStyle}>
              {t(lang, 'View in app', 'Ver en la app')}
            </Button>
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
  component: CommentNotificationEmail,
  subject: (data: Record<string, any>) =>
    data.isReply
      ? (data.lang === 'es'
          ? `Respuesta en: ${data.itemTitle || 'Ítem'}`
          : `Reply on: ${data.itemTitle || 'Item'}`)
      : (data.lang === 'es'
          ? `Nuevo comentario en: ${data.itemTitle || 'Ítem'}`
          : `New comment on: ${data.itemTitle || 'Item'}`),
  displayName: 'Comment notification',
  previewData: {
    projectName: 'Proyecto Demo',
    phaseName: 'Fase 1 - Planificación',
    itemTitle: 'Revisión de documentación',
    commentAuthor: 'Juan García',
    commentBody: 'He revisado el documento y todo está correcto. Procedemos con la siguiente fase.',
    isReply: false,
    lang: 'es',
    itemUrl: 'https://example.com/dashboard/projects',
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
const commentCard = {
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '24px',
  border: '1px solid #fde68a',
}
const commentLabel = {
  fontSize: '11px',
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  color: '#92400e',
  margin: '0 0 8px',
  letterSpacing: '0.5px',
}
const commentText = {
  fontSize: '14px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
}
const btnStyle = {
  backgroundColor: '#0066cc',
  color: '#ffffff',
  padding: '10px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none' as const,
}
const footer = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '0',
  fontStyle: 'italic' as const,
}

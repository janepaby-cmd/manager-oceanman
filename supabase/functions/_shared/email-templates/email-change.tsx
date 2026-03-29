/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma el cambio de email en {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={headerLabel}>{siteName}</Text>
        </Section>
        <Heading style={h1}>Confirma el cambio de email</Heading>
        <Text style={text}>
          Solicitaste cambiar tu dirección de correo en {siteName} de{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}a{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>
          Haz clic en el botón para confirmar este cambio:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar Cambio de Email
        </Button>
        <Text style={footer}>
          Si no solicitaste este cambio, protege tu cuenta de inmediato.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '520px', margin: '0 auto' }
const headerSection = { marginBottom: '24px' }
const headerLabel = { fontSize: '11px', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: '#0066cc', margin: '0' }
const h1 = { fontSize: '20px', fontWeight: '600' as const, color: '#111827', margin: '0 0 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: 'inherit', textDecoration: 'underline' }
const button = { backgroundColor: '#0066cc', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 24px', textDecoration: 'none', fontWeight: '500' as const }
const footer = { fontSize: '11px', color: '#9ca3af', margin: '30px 0 0', fontStyle: 'italic' as const }

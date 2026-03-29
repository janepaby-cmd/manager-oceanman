/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu enlace de acceso a {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={headerLabel}>{siteName}</Text>
        </Section>
        <Heading style={h1}>Tu enlace de acceso</Heading>
        <Text style={text}>
          Haz clic en el botón para iniciar sesión en {siteName}. Este enlace expirará pronto.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Iniciar Sesión
        </Button>
        <Text style={footer}>
          Si no solicitaste este enlace, puedes ignorar este correo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '520px', margin: '0 auto' }
const headerSection = { marginBottom: '24px' }
const headerLabel = { fontSize: '11px', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: '#0066cc', margin: '0' }
const h1 = { fontSize: '20px', fontWeight: '600' as const, color: '#111827', margin: '0 0 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 24px' }
const button = { backgroundColor: '#0066cc', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 24px', textDecoration: 'none', fontWeight: '500' as const }
const footer = { fontSize: '11px', color: '#9ca3af', margin: '30px 0 0', fontStyle: 'italic' as const }

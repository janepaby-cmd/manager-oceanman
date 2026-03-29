/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={headerLabel}>manager-oceanman</Text>
        </Section>
        <Heading style={h1}>Código de verificación</Heading>
        <Text style={text}>Usa el siguiente código para confirmar tu identidad:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Este código expirará pronto. Si no lo solicitaste, puedes ignorar este correo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '520px', margin: '0 auto' }
const headerSection = { marginBottom: '24px' }
const headerLabel = { fontSize: '11px', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: '#0066cc', margin: '0' }
const h1 = { fontSize: '20px', fontWeight: '600' as const, color: '#111827', margin: '0 0 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 24px' }
const codeStyle = { fontFamily: "'JetBrains Mono', Courier, monospace", fontSize: '24px', fontWeight: '600' as const, color: '#0066cc', margin: '0 0 30px', letterSpacing: '4px' }
const footer = { fontSize: '11px', color: '#9ca3af', margin: '30px 0 0', fontStyle: 'italic' as const }

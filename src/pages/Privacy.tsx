import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck, Lock, Database, KeyRound, FileLock2, Mail } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function Privacy() {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const appName = settings.app_name || "OceanMan";
  const contactEmail = settings.email_reply_to || settings.email_sender_address;

  const sections = [
    {
      icon: KeyRound,
      title: "Acceso y autenticación",
      body: "El acceso requiere iniciar sesión con correo y contraseña. Las sesiones se gestionan de forma segura y cada usuario solo accede a las áreas permitidas por su rol.",
    },
    {
      icon: Database,
      title: "Aislamiento de datos por proyecto",
      body: "La información está protegida con reglas de seguridad a nivel de fila. Cada persona solo puede ver y modificar los datos de los proyectos a los que pertenece, según su rol.",
    },
    {
      icon: FileLock2,
      title: "Almacenamiento de archivos",
      body: "Los documentos y comprobantes se guardan en almacenamiento privado. El acceso se concede mediante enlaces firmados temporales y únicamente a los miembros del proyecto correspondiente.",
    },
    {
      icon: Lock,
      title: "Cifrado en tránsito",
      body: "Toda la comunicación con la aplicación viaja cifrada mediante HTTPS/TLS.",
    },
    {
      icon: ShieldCheck,
      title: "Roles y permisos",
      body: "Los permisos se gestionan de forma centralizada en el servidor. Los privilegios elevados (administración) están reservados a roles autorizados y se validan en cada operación.",
    },
    {
      icon: Mail,
      title: "Comunicaciones y datos personales",
      body: "Los datos personales se utilizan únicamente para la gestión de proyectos y las notificaciones del servicio. Las personas pueden solicitar la baja de las comunicaciones por correo.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver
        </Button>

        <div className="mb-8">
          <Badge variant="secondary" className="mb-3">Privacidad y seguridad</Badge>
          <h1 className="text-2xl font-semibold tracking-tight">
            Centro de confianza de {appName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta página la mantiene el equipo de {appName} para responder a las preguntas
            más habituales sobre cómo protegemos la información dentro de la aplicación.
            Su contenido es editable y no constituye una certificación independiente.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((s) => (
            <Card key={s.title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <s.icon className="h-4 w-4 text-primary" /> {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Responsabilidad compartida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              La plataforma sobre la que se ejecuta {appName} aporta la infraestructura
              de alojamiento, base de datos y autenticación. El equipo de {appName} es
              responsable de la configuración de acceso, los roles y el tratamiento de los
              datos dentro de la aplicación.
            </p>
            {contactEmail && (
              <p>
                Para consultas de seguridad o privacidad, escríbenos a{" "}
                <a className="text-primary underline" href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>
                .
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

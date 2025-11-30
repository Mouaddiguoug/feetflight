import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
} from '@react-email/components';

export interface VerifyEmailProps {
  userName: string;
  token: string;
  domain: string;
  role: string;
}

export function VerifyEmailTemplate({ userName, token, domain, role }: VerifyEmailProps) {
  const verificationUrl = `${domain}/users/confirmation/${token}`;

  return (
    <Html lang="en">
      <Head>
        <title>Feetflight - Verify Email</title>
      </Head>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={sectionStyle}>
            <Heading as="h1" style={h1Style}>
              Feetflight
            </Heading>
            <Heading as="h3" style={h3Style}>
              Welcome {userName}
            </Heading>
            <Text style={textStyle}>
              this is your last step to start your journey of {role} cool attractive looking feet
            </Text>
            <Text style={textStyle}>please verify your email and proceed</Text>
            <Button href={verificationUrl} style={buttonStyle}>
              Verify
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles matching the original handlebars template
const bodyStyle = {
  fontFamily: 'Arial, sans-serif',
  backgroundColor: '#ffffff',
  margin: 0,
  padding: 0,
};

const containerStyle = {
  width: '100%',
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const sectionStyle = {
  display: 'grid',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center' as const,
};

const h1Style = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const h3Style = {
  textAlign: 'center' as const,
  margin: '10px 0',
};

const textStyle = {
  textAlign: 'center' as const,
  margin: '10px 0',
};

const buttonStyle = {
  backgroundColor: '#008000',
  color: '#ffffff',
  marginTop: '30px',
  borderRadius: '20px',
  fontWeight: 700,
  border: '0',
  width: '50%',
  padding: '14px auto',
  textAlign: 'center' as const,
  textDecoration: 'none',
  display: 'inline-block',
  cursor: 'pointer',
};

export default VerifyEmailTemplate;

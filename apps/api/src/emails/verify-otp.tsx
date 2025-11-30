import { Html, Head, Body, Container, Heading, Text, Section } from '@react-email/components';

/**
 * VerifyOtpTemplate
 *
 * React Email template for OTP verification emails.
 * Replaces the handlebars template in public/views/verifying_otp_template.handlebars
 *
 * @param {string} otp - The 4-digit OTP code (valid for 2 minutes)
 *
 * @example
 * ```typescript
 * import { render } from '@react-email/render';
 * import { VerifyOtpTemplate } from '@/emails/verify-otp';
 *
 * const html = await render(VerifyOtpTemplate({ otp: '1234' }));
 * await resend.emails.send({
 *   from: 'noreply@feetflight.com',
 *   to: 'user@example.com',
 *   subject: 'OTP Verification Email',
 *   html,
 * });
 * ```
 */
export interface VerifyOtpProps {
  otp: string;
}

export function VerifyOtpTemplate({ otp }: VerifyOtpProps) {
  return (
    <Html lang="en">
      <Head>
        <title>Feetflight - OTP Verification</title>
      </Head>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={sectionStyle}>
            <Heading as="h1" style={h1Style}>
              Feetflight
            </Heading>
            <Heading as="h3" style={h3Style}>
              Hello again
            </Heading>
            <Text style={textStyle}>
              We have received a request to change the password associated with your account. As
              part of our security measures, we have generated an OTP to verify your identity for
              this action.
            </Text>
            <Text style={otpTextStyle}>Your OTP is: {otp}</Text>
            <Text style={textStyle}>
              Please ensure that you use the OTP within the next 2 minutes.
            </Text>
            <Text style={textStyle}>Best regards,</Text>
            <Text style={textStyle}>Feetflight</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles matching verify-email.tsx pattern and original handlebars template
const bodyStyle = {
  fontFamily: 'Arial, sans-serif',
  backgroundColor: '#ffffff',
  margin: 0,
  padding: 0,
};

const containerStyle = {
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
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
  fontSize: '28px',
  fontWeight: 700,
};

const h3Style = {
  textAlign: 'center' as const,
  margin: '10px 0',
  fontSize: '20px',
};

const textStyle = {
  textAlign: 'center' as const,
  margin: '10px 0',
  fontSize: '14px',
};

const otpTextStyle = {
  textAlign: 'center' as const,
  margin: '20px 0',
  fontSize: '20px',
  fontWeight: 700,
  color: '#008000',
};

export default VerifyOtpTemplate;

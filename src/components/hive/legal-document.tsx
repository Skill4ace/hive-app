import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LegalDoc = 'privacy' | 'terms';

const CONTACT_EMAIL = 'tryhivehomes@gmail.com';

type LegalSection = {
  heading: string;
  body?: string[];
  bullets?: string[];
};

type LegalContent = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

const DOCS: Record<LegalDoc, LegalContent> = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'May 30, 2026',
    intro:
      'Hive helps college students discover apartment listings and coordinate housing decisions with roommates. This policy explains what we collect, how we use it, and the choices you have. We do not sell your personal information.',
    sections: [
      {
        heading: 'Information we collect',
        bullets: [
          'Account: an anonymous account identifier created when you sign in, plus the username and campus you choose.',
          'Search preferences: budget range, move-in window, distance, bedroom, bathroom, and parking preferences.',
          'Activity: listings you like or pass, saved matches, and votes within a group.',
          'Groups: groups you create or join and their invite codes.',
          'Housing requests: the name, email, and message you submit when contacting a listing or housing partner.',
          'Device and diagnostics: basic technical data needed to run and debug the app, such as app version, device type, and crash logs.',
        ],
      },
      {
        heading: 'How we use your information',
        bullets: [
          'Provide and personalize apartment matching.',
          'Sync decisions and votes among members of a group you join.',
          'Deliver the housing requests you choose to send to the relevant listing contact.',
          'Keep Hive secure, prevent abuse, and fix bugs.',
        ],
      },
      {
        heading: 'How information is shared',
        bullets: [
          'With your group: a limited profile (username, budget range, neighborhoods, move-in window) and your group votes.',
          'With housing partners: only the contact details and message you choose to send.',
          'Service providers: we use Supabase to host accounts and data on our behalf.',
          'Legal: when required by law or to protect the rights and safety of our users.',
        ],
      },
      {
        heading: 'Data retention and deletion',
        body: [
          'We keep your data while your account is active. You can delete your account at any time from Profile, which permanently removes your profile, saved decisions, group votes, and any groups you own, and clears the data stored on your device.',
        ],
      },
      {
        heading: 'Your choices and rights',
        body: [
          'You can edit your preferences, leave groups, clear saved matches, and delete your account directly in the app. Depending on where you live (for example, California or the EEA), you may have additional rights to access, correct, or delete your data. Contact us to make a request.',
        ],
      },
      {
        heading: "Children's privacy",
        body: [
          'Hive is intended for users 17 and older and is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us data, contact us and we will delete it.',
        ],
      },
      {
        heading: 'Security',
        body: [
          'We use industry-standard safeguards, including encryption in transit and access controls, to protect your information. No method of storage or transmission is completely secure, so we cannot guarantee absolute security.',
        ],
      },
      {
        heading: 'Changes to this policy',
        body: [
          'We may update this policy from time to time. Material changes will be reflected by the "Last updated" date above, and continued use of Hive after an update means you accept the revised policy.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'May 30, 2026',
    intro:
      'These Terms govern your use of Hive. By using the app, you agree to them. Please read them carefully.',
    sections: [
      {
        heading: 'Eligibility',
        body: [
          'You must be at least 17 years old and able to form a binding agreement to use Hive. By using the app, you confirm that you meet these requirements.',
        ],
      },
      {
        heading: 'What Hive does',
        body: [
          'Hive is a tool to discover apartment listings and coordinate housing decisions with roommates. Hive is not a real-estate broker, agent, landlord, or a party to any lease or rental agreement.',
          'Listings, pricing, and availability are provided for convenience, may come from third parties, and can be inaccurate or out of date. Always verify details directly with the listing provider before making any decision.',
        ],
      },
      {
        heading: 'Your account',
        body: [
          'You are responsible for activity that happens under your account and for the accuracy of the information you provide, including your username and any housing requests you submit.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: ['You agree not to:'],
        bullets: [
          'Use Hive for unlawful, harassing, fraudulent, or infringing activity.',
          'Scrape, reverse engineer, or interfere with the operation or security of the service.',
          'Impersonate others or share another person’s personal information without permission.',
        ],
      },
      {
        heading: 'Groups and shared content',
        body: [
          'When you create or join a group, certain preferences and votes are shared with its members. Only invite people you trust. You are responsible for the content you share, and you must have the right to share it.',
        ],
      },
      {
        heading: 'Housing requests',
        body: [
          'When you submit a request to a listing or housing partner, you authorize us to share the contact details and message you provide with that party. We do not guarantee a response, a viewing, or any housing outcome.',
        ],
      },
      {
        heading: 'Disclaimers',
        body: [
          'Hive is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not warrant that listings are accurate, available, or suitable, or that the service will be uninterrupted or error-free.',
        ],
      },
      {
        heading: 'Limitation of liability',
        body: [
          'To the maximum extent permitted by law, Hive and its developer are not liable for any indirect, incidental, special, or consequential damages, or for any housing, financial, or other decisions you make based on the app.',
        ],
      },
      {
        heading: 'Termination',
        body: [
          'You may stop using Hive and delete your account at any time from your Profile. We may suspend or terminate access if you violate these Terms or misuse the service.',
        ],
      },
      {
        heading: 'Apple App Store',
        body: [
          'These Terms are between you and Hive, not Apple. Apple is not responsible for the app or its content and has no obligation to provide support or maintenance. Apple is a third-party beneficiary of these Terms and may enforce them against you. You agree to comply with the Apple App Store Terms of Service when using the app.',
        ],
      },
      {
        heading: 'Changes to these Terms',
        body: [
          'We may update these Terms from time to time. Material changes will be reflected by the "Last updated" date above, and continued use of Hive after an update means you accept the revised Terms.',
        ],
      },
    ],
  },
};

type LegalSheetProps = {
  doc: LegalDoc | null;
  onClose: () => void;
};

export function LegalSheet({ doc, onClose }: LegalSheetProps) {
  const theme = useTheme();
  const content = doc ? DOCS[doc] : null;

  return (
    <BottomSheet visible={doc !== null} title={content?.title ?? ''} onClose={onClose}>
      {content ? (
        <ScrollView
          style={[styles.scroll, { maxHeight: Dimensions.get('window').height * 0.62 }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <ThemedText type="caption" themeColor="textTertiary">
            Last updated {content.updated}
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.paragraph}>
            {content.intro}
          </ThemedText>

          {content.sections.map((section, index) => (
            <View key={section.heading} style={styles.section}>
              <View style={styles.heading}>
                <View style={[styles.indexBadge, { backgroundColor: theme.primarySoft }]}>
                  <ThemedText type="caption" style={{ color: theme.primary }}>
                    {index + 1}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.headingText}>
                  {section.heading}
                </ThemedText>
              </View>

              {section.body?.map((paragraph, i) => (
                <ThemedText key={i} type="small" themeColor="textSecondary" style={styles.paragraph}>
                  {paragraph}
                </ThemedText>
              ))}

              {section.bullets ? (
                <View style={styles.bullets}>
                  {section.bullets.map((bullet, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <View style={[styles.bulletDot, { backgroundColor: theme.primary }]} />
                      <ThemedText type="small" themeColor="textSecondary" style={styles.bulletText}>
                        {bullet}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}

          <ThemedText type="caption" themeColor="textTertiary" style={styles.footer}>
            Questions? Email {CONTACT_EMAIL}
          </ThemedText>
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    alignSelf: 'stretch',
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  indexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingText: {
    flex: 1,
  },
  paragraph: {
    lineHeight: 21,
  },
  bullets: {
    gap: Spacing.one,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    lineHeight: 21,
  },
  footer: {
    paddingTop: Spacing.one,
  },
});

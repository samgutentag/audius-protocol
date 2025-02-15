import { email, password, name, handle } from '../fixtures/user.json'

function assertOnSignInPage() {
  cy.findByRole('heading', { name: /sign into audius/i, level: 1 }).should(
    'exist'
  )
}

describe('Sign In', () => {
  beforeEach(() => {
    localStorage.setItem('FeatureFlagOverride:sign_up_redesign', 'enabled')
  })

  it('can navigate to sign-in from trending screen', () => {
    cy.visit('trending')
    cy.findByText(/have an account\?/i).should('exist')
    cy.findByRole('link', { name: /sign in/i }).click()
    assertOnSignInPage()
  })

  it('/signin goes to sign-in', () => {
    cy.visit('signin')
    assertOnSignInPage()
  })

  it('can navigate to sign-in from sign-up', () => {
    cy.visit('signup')
    cy.findByText(/already have an account?/i)
    cy.findByRole('link', { name: /Sign In/ }).click()
    assertOnSignInPage()
  })

  it('can sign in', () => {
    cy.visit('signin')
    assertOnSignInPage()
    cy.findByRole('textbox', { name: /email/i }).type(email)
    cy.findByRole('textbox', { name: /password/i }).type(password)
    cy.findByRole('button', { name: /sign in/i }).click()

    cy.findByRole('heading', {
      name: /your feed/i,
      level: 1,
      timeout: 20000
    }).should('exist')

    cy.findByText(name).should('exist')
    cy.findByText(`@${handle}`).should('exist')
  })
})

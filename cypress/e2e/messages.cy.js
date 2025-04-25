import { setupTestEnvironment, getCurrentUser, getCompanyData } from "../support/testSetup";

describe('Messaging System', () => {
  // Set up the environment before tests
  setupTestEnvironment();

  beforeEach(() => {
    // Ensure the user is logged in and navigate to the "Messages" page
    cy.loginWithCurrentUser(); // Log in with the current user
    cy.get('.left-side-page-bar a').contains('Messages').click(); // Click the "Messages" link in the left navigation bar
    cy.url().should('include', '/messages'); // Verify that the URL includes '/messages'
  });

  describe('Inbox Page', () => {
    beforeEach(() => {
      // Visit the inbox page
      cy.visit('/messages/inbox');
    });

    it('displays the inbox page with navigation and search bar', () => {
      // Verify the navigation tabs
      cy.get('.nav.nav-pills').within(() => {
        cy.contains('a', 'Inbox').should('have.class', 'active');
        cy.contains('a', 'Sent').should('exist');
      });

      // Verify the search bar
      cy.get('#messageSearch').should('be.visible').and('have.attr', 'placeholder', 'Search messages...');
      cy.get('.btn-outline-secondary').should('be.visible').and('contain.html', '<i class="fas fa-search"></i>');
    });

    it('displays a message if the inbox is empty', () => {
      // Check for the "Your inbox is empty" message
      cy.get('.list-group').within(() => {
        cy.contains('p', 'Your inbox is empty.').should('be.visible');
      });
    });

    // it('displays messages in the inbox', () => {
    //   // Check that at least one message is displayed
    //   cy.get('.list-group-item').should('have.length.greaterThan', 0);

    //   // Verify the structure of a message item
    //   cy.get('.list-group-item').first().within(() => {
    //     cy.get('.avatar').should('be.visible'); // Check for the avatar
    //     cy.get('h5').should('be.visible'); // Check for the sender's name and subject
    //     cy.get('p').should('be.visible'); // Check for the message preview
    //     cy.get('small').should('be.visible'); // Check for the timestamp
    //   });
    // });

    // it('navigates to a message thread when a message is clicked', () => {
    //   // Click the first message in the list
    //   cy.get('.list-group-item').first().click();

    //   // Verify that the URL changes to the thread page
    //   cy.url().should('include', '/messages/');
    // });
  });

  describe('New Message Page', () => {
    beforeEach(() => {
      // Visit the new message page
      cy.visit('/messages/new');
    });

    it('displays the new message form', () => {
      // Verify the form fields are visible
      cy.get('select#recipient').should('be.visible'); // Updated to check for the dropdown
      cy.get('input#subject').should('be.visible');
      cy.get('textarea#content').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible').and('contain.text', 'Send Message');
    });

    it('validates required fields before sending a message', () => {
      // Submit the form without filling in any fields
      cy.get('button[type="submit"]').click();

      // Verify that validation messages are displayed
      cy.get('select#recipient').then(($select) => {
        expect($select[0].validationMessage).to.eq('Please select an item in the list.');
      });
      cy.get('input#subject').then(($input) => {
        expect($input[0].validationMessage).to.eq('Please fill out this field.');
      });
      cy.get('textarea#content').then(($textarea) => {
        expect($textarea[0].validationMessage).to.eq('Please fill out this field.');
      });
    });

    // it('sends a new message successfully', () => {
    //   // Select a recipient from the dropdown
    //   cy.get('select#recipient').select(''); // Replace with a valid recipient name or ID

    //   // Fill in the subject and content
    //   cy.get('input#subject').type('Test Subject');
    //   cy.get('textarea#content').type('This is a test message.');

    //   // Submit the form
    //   cy.get('button[type="submit"]').click();

    //   // Verify that the form submission redirects to the inbox or shows a success message
    //   cy.url().should('include', '/messages/inbox'); // Adjust based on your app's behavior
    //   cy.contains('Message sent successfully').should('be.visible'); // Replace with the actual success message
    // });
  });

  describe('Sent Messages Page', () => {
    beforeEach(() => {
      // Visit the sent messages page
      cy.visit('/messages/sent');
    });

    it('displays the sent messages page', () => {
      // Verify the navigation tabs
      cy.get('.nav.nav-pills').within(() => {
        cy.contains('a', 'Inbox').should('exist');
        cy.contains('a', 'Sent').should('have.class', 'active');
      });

    //   // Check that at least one sent message is displayed
    //   cy.get('.list-group-item').should('have.length.greaterThan', 0);
    });
  });

//   describe('Message Thread Page', () => {
//     beforeEach(() => {
//       // Visit a specific message thread
//       cy.visit('/messages/thread/12345'); // Replace with a valid thread ID
//     });

//     it('displays the message thread', () => {
//       // Verify the thread container is visible
//       cy.get('.message-thread').should('be.visible');

//       // Check that at least one message in the thread is displayed
//       cy.get('.message-thread .message').should('have.length.greaterThan', 0);

//       // Verify the structure of a message in the thread
//       cy.get('.message-thread .message').first().within(() => {
//         cy.get('.sender').should('be.visible'); // Check for the sender's name
//         cy.get('.content').should('be.visible'); // Check for the message content
//       });
//     });

//     it('sends a reply in the thread', () => {
//       // Type a reply
//       cy.get('textarea#replyContent').type('This is a test reply.');

//       // Submit the reply
//       cy.get('button[type="submit"]').click();

//       // Verify that the reply is added to the thread
//       cy.get('.message-thread .message').last().within(() => {
//         cy.get('.content').should('contain.text', 'This is a test reply.');
//       });
//     });
//   });
});
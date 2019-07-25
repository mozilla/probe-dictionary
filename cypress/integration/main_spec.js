import { O_TRUNC } from "constants";
import { getFriendlyExpiryDescriptionForHistory } from "../../src/lib/utils";

describe('Probe Dictionary Main Component', () => {
  it('successfully loads', () => {
    cy.visit('/');
    cy.get('.container-full').should('be.visible');
  });

  it('auto-checks release-only checkbox upon selecting the release channel probe filter', () => {
    cy.get('#select_channel').select('release');
    cy.get('#optout').should('be.disabled').should('be.checked');
  });

  it('enables release-only checkbox upon selecting a non-release channel probe filter', () => {
    cy.get('#select_channel').select('beta');
    cy.get('#optout').should('not.be.disabled').should('be.checked');
  });

  it('sets/unsets URL search param when selecting channel probe filter', () => {
    cy.url().should('include', 'channel=beta');
    cy.get('#select_channel').select('any');
    cy.url().should('not.include', 'channel=');
  });

  it('sets/unsets URL search param when selecting version probe filter', () => {
    cy.get('#select_channel').select('nightly'); // needs to be anything but "any"
    cy.get('#select_version').select('60');
    cy.url().should('include', 'version=60');
    cy.get('#select_version').select('any');
    cy.url().should('not.include', 'version=');
  });

  it('sets/unsets URL search param when selecting constraint probe filter', () => {
    cy.get('#select_constraint').select('new_in');
    cy.url().should('include', 'constraint=new_in');
    cy.get('#select_constraint').select('is_in');
    cy.url().should('not.include', 'constraint=');
  });

  it('sets/unsets URL search param when selecting search constraint', () => {
    cy.get('#search_constraint').select('in_description');
    cy.url().should('include', 'searchtype=in_description');
    cy.get('#search_constraint').select('in_any');
    cy.url().should('not.include', 'searchtype=');
  });

  it('opens/closes probe details and sets/unsets URL search param on probe listing click', () => {
    cy.get('#search-results-table tbody tr:first-child').click();
    cy.url().should('include', 'view=detail');
    cy.get('#probe-detail-view').should('be.visible');
    cy.get('#close-detail-view').click();
    cy.url().should('not.include', 'view=');
    cy.get('#probe-detail-view').should('not.be.visible');
  });

  it('opens/closes stats view and sets/unsets URL search param on stats nav button click', () => {
    cy.get('.navbar-nav .btn-stats').click();
    cy.url().should('include', 'view=stats');
    cy.get('#stats-view').should('be.visible');
    cy.get('.navbar-nav .btn-find-probes').click();
    cy.get('#stats-view').should('not.be.visible');
    cy.url().should('not.include', 'view=');
  });

  it('opens stats view when URL search param is set', () => {
    cy.visit('/?view=stats');

    cy.get('#stats-view').should('be.visible');
    cy.get('#text-search-element').should('not.be.visible');
    cy.get('#optout-selection-element').should('not.be.visible');
    cy.get('#version-selection-element').should('not.be.visible');
    cy.get('#select_constraint').should('be.visible');
    cy.get('#select_channel').should('be.visible');
  });

  it('sets active channel to nightly if only version param is set', () => {
    cy.visit('/?version=60');

    cy.get('#select_channel').should('be.visible').should('have.value', 'nightly');
  });
});

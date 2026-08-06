"use strict";

const DATA_FILE = "data/arkansas-organizations.json";

let organizations = [];

const searchInput = document.getElementById("searchInput");
const countyFilter = document.getElementById("countyFilter");
const typeFilter = document.getElementById("typeFilter");
const animalFilter = document.getElementById("animalFilter");
const serviceFilter = document.getElementById("serviceFilter");
const clearFiltersButton = document.getElementById("clearFilters");
const directoryResults = document.getElementById("directoryResults");
const resultCount = document.getElementById("resultCount");
const emptyMessage = document.getElementById("emptyMessage");

async function loadOrganizations() {
  try {
    const response = await fetch(DATA_FILE);

    if (!response.ok) {
      throw new Error(`Could not load directory data: ${response.status}`);
    }

    organizations = await response.json();

    organizations.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });

    buildFilterOptions();
    displayOrganizations(organizations);
  } catch (error) {
    console.error(error);

    resultCount.textContent = "The directory could not be loaded.";

    directoryResults.innerHTML = `
      <div class="organization-card">
        <h2>Directory temporarily unavailable</h2>
        <p>
          Please check that the organization data file is located at
          <strong>data/arkansas-organizations.json</strong>.
        </p>
      </div>
    `;
  }
}

function buildFilterOptions() {
  const counties = getUniqueValues("county");
  const types = getUniqueValues("type");
  const services = getUniqueArrayValues("services");

  addOptions(countyFilter, counties);
  addOptions(typeFilter, types);
  addOptions(serviceFilter, services);
}

function getUniqueValues(property) {
  return [...new Set(
    organizations
      .map((organization) => organization[property])
      .filter(Boolean)
  )].sort();
}

function getUniqueArrayValues(property) {
  return [...new Set(
    organizations.flatMap((organization) => {
      return Array.isArray(organization[property])
        ? organization[property]
        : [];
    })
  )].sort();
}

function addOptions(selectElement, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });
}

function filterOrganizations() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCounty = countyFilter.value;
  const selectedType = typeFilter.value;
  const selectedAnimal = animalFilter.value;
  const selectedService = serviceFilter.value;

  const filtered = organizations.filter((organization) => {
    const searchableText = [
      organization.name,
      organization.type,
      organization.city,
      organization.county,
      organization.zip,
      organization.description,
      organization.intakePolicy,
      organization.serviceArea,
      ...(organization.animals || []),
      ...(organization.services || [])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !searchTerm || searchableText.includes(searchTerm);

    const matchesCounty =
      !selectedCounty || organization.county === selectedCounty;

    const matchesType =
      !selectedType || organization.type === selectedType;

    const matchesAnimal =
      !selectedAnimal ||
      (organization.animals || []).includes(selectedAnimal);

    const matchesService =
      !selectedService ||
      (organization.services || []).includes(selectedService);

    return (
      matchesSearch &&
      matchesCounty &&
      matchesType &&
      matchesAnimal &&
      matchesService
    );
  });

  displayOrganizations(filtered);
}

function displayOrganizations(items) {
  directoryResults.innerHTML = "";

  const organizationWord =
    items.length === 1 ? "organization" : "organizations";

  resultCount.textContent =
    `${items.length} ${organizationWord} found`;

  emptyMessage.hidden = items.length !== 0;

  items.forEach((organization) => {
    directoryResults.appendChild(createOrganizationCard(organization));
  });
}

function createOrganizationCard(organization) {
  const card = document.createElement("article");
  card.className = "organization-card";

  const locationParts = [
    organization.city,
    organization.county
      ? `${organization.county} County`
      : "",
    organization.zip
  ].filter(Boolean);

  card.innerHTML = `
    <h2>${escapeHtml(organization.name)}</h2>

    <p class="organization-location">
      ${escapeHtml(locationParts.join(" · "))}
    </p>

    <span class="organization-type">
      ${escapeHtml(organization.type || "Animal Welfare Organization")}
    </span>

    ${
      organization.description
        ? `<p>${escapeHtml(organization.description)}</p>`
        : ""
    }

    ${
      organization.animals?.length
        ? `
          <h3>Animals served</h3>
          ${createTagList(organization.animals)}
        `
        : ""
    }

    ${
      organization.services?.length
        ? `
          <h3>Services</h3>
          ${createTagList(organization.services)}
        `
        : ""
    }

    ${
      organization.intakePolicy
        ? `
          <h3>Intake information</h3>
          <p>${escapeHtml(organization.intakePolicy)}</p>
        `
        : ""
    }

    ${
      organization.serviceArea
        ? `
          <h3>Service area</h3>
          <p>${escapeHtml(organization.serviceArea)}</p>
        `
        : ""
    }

    <div class="contact-links">
      ${createContactLinks(organization)}
    </div>

    ${
      organization.verified
        ? `
        <p class="updated">
            Last verified: ${formatDate(organization.verified)}
          </p>
        `
        : ""
    }
  `;

  return card;
}

function createTagList(items) {
  return `
    <ul class="tag-list">
      ${items
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("")}
    </ul>
  `;
}

function createContactLinks(organization) {
  const links = [];

  if (organization.website) {
    links.push(`
      <a
        href="${safeUrl(organization.website)}"
        target="_blank"
        rel="noopener noreferrer"
        class="primary-link"
      >
        Website
      </a>
    `);
  }

  if (organization.phone) {
    const phoneNumber = organization.phone.replace(/[^\d+]/g, "");

    links.push(`
      <a href="tel:${phoneNumber}">
        Call
      </a>
    `);
  }

  if (organization.email) {
    links.push(`
      <a href="mailto:${escapeHtml(organization.email)}">
        Email
      </a>
    `);
  }

  if (organization.facebook) {
    links.push(`
      <a
        href="${safeUrl(organization.facebook)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Facebook
      </a>
    `);
  }

  if (organization.address) {
    const mapSearch = encodeURIComponent(organization.address);

    links.push(`
      <a
        href="https://www.google.com/maps/search/?api=1&query=${mapSearch}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Directions
      </a>
    `);
  }

  if (links.length === 0) {
    return "<p>Contact information is being verified.</p>";
  }

  return links.join("");
}

function clearFilters() {
  searchInput.value = "";
  countyFilter.value = "";
  typeFilter.value = "";
  animalFilter.value = "";
  serviceFilter.value = "";

  displayOrganizations(organizations);
  searchInput.focus();
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function safeUrl(url) {
  try {
    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return "#";
    }

    return parsedUrl.href;
  } catch {
    return "#";
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

searchInput.addEventListener("input", filterOrganizations);
countyFilter.addEventListener("change", filterOrganizations);
typeFilter.addEventListener("change", filterOrganizations);
animalFilter.addEventListener("change", filterOrganizations);
serviceFilter.addEventListener("change", filterOrganizations);
clearFiltersButton.addEventListener("click", clearFilters);

loadOrganizations();



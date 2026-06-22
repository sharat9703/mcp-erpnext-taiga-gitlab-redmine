/**
 * Software Release response formatters
 * Provides clean, human-readable output
 */

/**
 * Format MR details response
 */
export function formatMrDetails(result) {
  if (!result.mr) {
    return JSON.stringify(result, null, 2);
  }

  const mr = result.mr;
  const lines = [
    `Merge Request: ${mr.title}`,
    `URL: ${mr.webUrl}`,
    `Project: ${mr.projectPath}`,
    `Branch: ${mr.sourceBranch} → ${mr.targetBranch}`,
    `Author: ${mr.author || 'N/A'}`,
    ''
  ];

  if (result.detectedCustomer) {
    lines.push(`Detected Customer: ${result.detectedCustomer} (${result.customerConfidence} confidence)`);
  } else if (result.isStandardProduct) {
    lines.push('This appears to be a standard product release (no specific customer)');
  } else {
    lines.push('Customer: Could not auto-detect - please select manually');
  }

  if (result.detectedVersion) {
    lines.push(`Detected Version: ${result.detectedVersion}`);
  }

  if (result.detectedRedmineIds && result.detectedRedmineIds.length > 0) {
    lines.push('', 'Detected Redmine IDs:');
    result.detectedRedmineIds.forEach(r => {
      lines.push(`  - #${r.id}: ${r.url}`);
    });
  }

  if (result.message) {
    lines.push('', result.message);
  }

  return lines.join('\n');
}

/**
 * Format products list
 */
export function formatProductsList(result) {
  const products = result.products || result;

  if (!Array.isArray(products) || products.length === 0) {
    return 'No products found.';
  }

  const lines = ['Available Products:', ''];
  products.forEach((p, i) => {
    const name = p.name || p.brand || p;
    lines.push(`${i + 1}. ${name}`);
  });

  if (result.message) {
    lines.push('', result.message);
  }

  return lines.join('\n');
}

/**
 * Format customers list
 */
export function formatCustomersList(result) {
  const customers = result.customers || result;

  if (!Array.isArray(customers) || customers.length === 0) {
    return 'No customers found.';
  }

  const lines = ['Available Customers:', ''];
  customers.forEach((c, i) => {
    const name = c.customer_name || c.name || c;
    lines.push(`${i + 1}. ${name}`);
  });

  if (result.message) {
    lines.push('', result.message);
  }

  return lines.join('\n');
}

/**
 * Format software release creation response
 */
export function formatReleaseCreated(result) {
  if (!result.success) {
    return `Error: ${result.error || 'Failed to create release'}`;
  }

  const release = result.release;
  const lines = [
    'Software Release Created Successfully!',
    '',
    `Name: ${release.name || release.release}`,
    `Product: ${release.product}`,
    `Version: ${release.version}`,
    `Release Type: ${release.release_type}`,
    `Release Date: ${release.release_date}`,
  ];

  if (release.customer) {
    lines.push(`Customer: ${release.customer}`);
  }

  if (result.releaseUrl) {
    lines.push('', `View in ERPNext: ${result.releaseUrl}`);
  }

  return lines.join('\n');
}

/**
 * Format software release preview
 */
export function formatReleasePreview(result) {
  const lines = [];

  // Header
  if (result.ready) {
    lines.push('✅ READY TO CREATE');
  } else {
    lines.push('⚠️ NOT READY - Missing required fields');
  }
  lines.push('');

  // Message
  if (result.message) {
    lines.push(result.message);
    lines.push('');
  }

  // MR Info
  if (result.mrInfo) {
    lines.push('─── Merge Request ───');
    lines.push(`Title: ${result.mrInfo.title}`);
    lines.push(`Branch: ${result.mrInfo.sourceBranch}`);
    lines.push(`Project: ${result.mrInfo.projectPath}`);
    lines.push('');
  }

  // Template used
  if (result.templateUsed) {
    lines.push(`Template: ${result.templateUsed}`);
    lines.push('');
  }

  // Fields table
  lines.push('─── Release Fields ───');
  const fields = result.fields || {};
  const sources = result.sources || {};

  const fieldOrder = [
    ['product', 'Product'],
    ['customer', 'Customer'],
    ['release_name', 'Release Name'],
    ['version', 'Version'],
    ['release_type', 'Release Type'],
    ['release_date', 'Release Date'],
    ['released_by', 'Released By'],
    ['reviewer', 'Reviewer']
  ];

  for (const [key, label] of fieldOrder) {
    const value = fields[key] || '(not set)';
    const source = sources[key] || '';
    const indicator = fields[key] ? '✓' : '✗';
    lines.push(`${indicator} ${label}: ${value}`);
    if (source) {
      lines.push(`  └─ Source: ${source}`);
    }
  }

  // Redmine IDs
  lines.push('');
  lines.push('─── Redmine Tickets ───');
  if (fields.redmine_ids && fields.redmine_ids.length > 0) {
    fields.redmine_ids.forEach((id, i) => {
      const title = fields.redmine_titles && fields.redmine_titles[i] ? fields.redmine_titles[i] : '(no title)';
      lines.push(`✓ #${id}: ${title}`);
    });
    if (sources.redmine_ids) {
      lines.push(`  └─ Source: ${sources.redmine_ids}`);
    }
    if (sources.redmine_titles) {
      lines.push(`  └─ Titles: ${sources.redmine_titles}`);
    }
  } else {
    lines.push('✗ No Redmine IDs (required)');
  }

  // URLs
  lines.push('');
  lines.push('─── Files & URLs ───');

  const urlFields = [
    ['patch_urls', 'Patch Files', true],
    ['test_report_urls', 'Test Reports', false],
    ['manual_script_urls', 'Manual Scripts', false],
    ['config_urls', 'Config Files', false],
    ['mr_urls', 'MR Links', true]
  ];

  for (const [key, label, required] of urlFields) {
    const urls = fields[key] || [];
    if (urls.length > 0) {
      lines.push(`✓ ${label}: ${urls.length} file(s)`);
      urls.forEach(url => {
        // Extract filename from URL
        const filename = url.split('/').pop() || url;
        lines.push(`  • ${filename}`);
      });
      if (sources[key]) {
        lines.push(`  └─ Source: ${sources[key]}`);
      }
    } else if (required) {
      lines.push(`✗ ${label}: (none - required)`);
    } else {
      lines.push(`- ${label}: (none)`);
    }
  }

  // Warnings
  if (result.warnings && result.warnings.length > 0) {
    lines.push('');
    lines.push('─── Warnings ───');
    result.warnings.forEach(w => {
      lines.push(`⚠️ ${w}`);
    });
  }

  // Next steps
  lines.push('');
  lines.push('─── Next Steps ───');
  if (result.ready) {
    lines.push('Run "Create software release..." with the same parameters to create the release.');
  } else {
    lines.push('Provide the missing fields shown above, then preview again or create the release.');
  }

  return lines.join('\n');
}

/**
 * Format software releases list
 */
export function formatReleasesList(result) {
  const releases = Array.isArray(result) ? result : (result.data || []);

  if (releases.length === 0) {
    return 'No software releases found.';
  }

  const lines = [`Found ${releases.length} release(s):`, ''];

  releases.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.name || r.release}`);
    lines.push(`   Product: ${r.product} | Version: ${r.version} | Type: ${r.release_type}`);
    if (r.customer) {
      lines.push(`   Customer: ${r.customer}`);
    }
    lines.push(`   Date: ${r.release_date} | Released by: ${r.released_by_name || 'N/A'}`);
  });

  return lines.join('\n');
}

/**
 * Main formatter dispatcher
 */
export function formatSoftwareReleaseResponse(toolName, result) {
  if (toolName === 'erpnext_get_mr_details') {
    return formatMrDetails(result);
  }

  if (toolName === 'erpnext_list_products') {
    return formatProductsList(result);
  }

  if (toolName === 'erpnext_list_customers_for_release') {
    return formatCustomersList(result);
  }

  if (toolName === 'erpnext_create_software_release') {
    return formatReleaseCreated(result);
  }

  if (toolName === 'erpnext_preview_software_release') {
    return formatReleasePreview(result);
  }

  if (toolName === 'erpnext_list_software_releases') {
    return formatReleasesList(result);
  }

  // Default: JSON
  return JSON.stringify(result, null, 2);
}

export default {
  formatMrDetails,
  formatProductsList,
  formatCustomersList,
  formatReleaseCreated,
  formatReleasePreview,
  formatReleasesList,
  formatSoftwareReleaseResponse
};

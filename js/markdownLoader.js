// markdownLoader.js
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

export class MarkdownLoader {
    constructor() {
        // Initialize marked options
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false
        });
    }

    async loadMarkdownFile(filePath, containerId = 'release-notes-container') {
        try {
            const response = await fetch(filePath);
            
            if (!response.ok) {
                throw new Error(`Failed to load markdown file: ${response.status}`);
            }
            
            const markdownText = await response.text();
            const htmlContent = marked.parse(markdownText);
            
            this.displayMarkdown(htmlContent, containerId);
            return true;
        } catch (error) {
            console.error('Error loading markdown file:', error);
            this.displayError(containerId, error.message);
            return false;
        }
    }

    displayMarkdown(htmlContent, containerId) {
        let container = document.getElementById(containerId);
        
        if (!container) {
            // Create container if it doesn't exist
            const releaseNotesSection = document.getElementById('Release Notes');
            if (!releaseNotesSection) return;
            
            const card = releaseNotesSection.querySelector('.card');
            if (!card) return;
            
            // Remove existing static content after the title
            const title = card.querySelector('.card-title');
            const siblings = Array.from(card.children).filter(child => child !== title);
            siblings.forEach(sibling => sibling.remove());
            
            // Create container div
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'markdown-content';
            card.appendChild(container);
        }
        
        container.innerHTML = htmlContent;
        
        // Add markdown-specific styling
        this.styleMarkdownContent(container);
    }

    styleMarkdownContent(container) {
        // Add basic markdown styling
        container.style.lineHeight = '1.6';
        
        // Style headings
        container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
            heading.style.marginTop = '1.5em';
            heading.style.marginBottom = '0.5em';
            heading.style.fontWeight = '600';
        });
        
        // Style lists
        container.querySelectorAll('ul, ol').forEach(list => {
            list.style.marginLeft = '1.5em';
            list.style.marginBottom = '1em';
        });
        
        container.querySelectorAll('li').forEach(item => {
            item.style.marginBottom = '0.25em';
        });
        
        // Style code blocks
        container.querySelectorAll('pre').forEach(pre => {
            pre.style.backgroundColor = '#f5f5f5';
            pre.style.padding = '1em';
            pre.style.borderRadius = '4px';
            pre.style.overflowX = 'auto';
        });
        
        container.querySelectorAll('code').forEach(code => {
            if (!code.parentElement.matches('pre')) {
                code.style.backgroundColor = '#f0f0f0';
                code.style.padding = '2px 4px';
                code.style.borderRadius = '3px';
                code.style.fontFamily = 'monospace';
            }
        });
        
        // Style links
        container.querySelectorAll('a').forEach(link => {
            link.style.color = '#2196f3';
            link.style.textDecoration = 'none';
        });
        
        // Style paragraphs
        container.querySelectorAll('p').forEach(p => {
            p.style.marginBottom = '1em';
        });
        
        // Style blockquotes
        container.querySelectorAll('blockquote').forEach(quote => {
            quote.style.borderLeft = '4px solid #ddd';
            quote.style.margin = '1em 0';
            quote.style.paddingLeft = '1em';
            quote.style.color = '#666';
        });
        
        // Style tables
        container.querySelectorAll('table').forEach(table => {
            table.style.borderCollapse = 'collapse';
            table.style.width = '100%';
            table.style.marginBottom = '1em';
        });
        
        container.querySelectorAll('th, td').forEach(cell => {
            cell.style.border = '1px solid #ddd';
            cell.style.padding = '8px';
            cell.style.textAlign = 'left';
        });
        
        container.querySelectorAll('th').forEach(header => {
            header.style.backgroundColor = '#f5f5f5';
            header.style.fontWeight = 'bold';
        });
    }

    displayError(containerId, errorMessage) {
        let container = document.getElementById(containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'markdown-content error';
            
            const releaseNotesSection = document.getElementById('Release Notes');
            if (releaseNotesSection) {
                const card = releaseNotesSection.querySelector('.card');
                if (card) {
                    card.appendChild(container);
                }
            }
        }
        
        container.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Unable to Load Release Notes</h3>
                <p>Failed to load the release notes markdown file.</p>
                <p><strong>Error:</strong> ${errorMessage}</p>
                <p>Please check that the <code>readme.md</code> file exists in the project root.</p>
            </div>
        `;
    }

    async loadFromDefaultPath() {
        // Try common markdown file names
        const possiblePaths = [
            './README.md',
            './readme.md',
            './RELEASE_NOTES.md',
            './docs/README.md'
        ];
        
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path, { method: 'HEAD' });
                if (response.ok) {
                    return await this.loadMarkdownFile(path);
                }
            } catch (error) {
                continue;
            }
        }
        
        // If no markdown file found, show default content
        this.displayDefaultContent();
        return false;
    }

    displayDefaultContent() {
        const containerId = 'release-notes-container';
        const container = document.getElementById(containerId);
        
        if (container) {
            container.innerHTML = `
                <h3>📝 Release Notes</h3>
                <p>No markdown file found. Using default content.</p>
                <p>Create a <code>README.md</code> file in the project root to display custom release notes.</p>
            `;
        }
    }
}
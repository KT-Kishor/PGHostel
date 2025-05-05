sap.ui.define(["../model/formatter"], function (Formatter) {
    "use strict";
    return {
        Formatter: Formatter,

        _checkPageBreak: function (currentYPosition, bottomLimit, doc, topMargin, backImgX, backImgY, oModel) {
            if (currentYPosition >= bottomLimit) {
                doc.addPage(); // Add a new page if the current position exceeds the limit
                doc.addImage(oModel.CompanyLogoHeader, "PNG", 125, 8, 65, 14.5);
                doc.setGState(new doc.GState({ opacity: 0.2 }));
                doc.addImage(oModel.CompanyBackImage, "PNG", backImgX, backImgY, 100, 100);
                doc.setGState(new doc.GState({ opacity: 1 }));
                currentYPosition = topMargin; // Reset to top margin on the new page
            }
            return currentYPosition; // Return updated Y position
        },

        _pdfContent: function (that, doc, pageWidth, pageHeight, margin, paraMargin, topMargin, maxWidth, pageMiddle, bottomLimit, currentY, backImgX, backImgY, oModel, oCompanyModel, content) {
            doc.addImage(oModel.CompanyLogoHeader, "PNG", 125, 8, 65, 14.5);
            doc.setGState(new doc.GState({ opacity: 0.2 }));
            doc.addImage(oModel.CompanyBackImage, "PNG", backImgX, backImgY, 100, 100);
            doc.setGState(new doc.GState({ opacity: 1 }));
            let titleY = currentY;
            let titleText = content[0].Title;
            doc.setFont("times", "bold").setFontSize(12);
            let textWidth = doc.getTextWidth(titleText);
            let titleX = (pageWidth - textWidth) / 2;
            doc.text(titleText, titleX, titleY);
            doc.setFont("times", "normal").setFontSize(11);

            let titleContentY = titleY + 10; // Initial Y position after titleY
            const boldWords = ["AND", `${oCompanyModel.companyName}`, "NON-DISCLOSURE AGREEMENT", "India", `${oCompanyModel.headOfCompany} - ${oCompanyModel.designation}`, `${oModel.ClientCompanyName}`, "Company", "Other Party", `${oModel.ClientName} - ${oModel.ClientRole}`, "Disclosing Party", "Receiving Party", "Contractor", "(SOW)"];
            const boldWordList = boldWords.join(" ").split(" ");

            for (let i = 0; i < 10; i++) {
                if (!content[i]?.TitleContent) break;

                let titleContent = new Function("oCompanyModel", "oModel", `return ${content[i].TitleContent};`)(oCompanyModel, oModel);
                let titleContentLines = doc.splitTextToSize(titleContent, maxWidth);

                titleContentLines.forEach((line, lineIndex) => {
                    let words = line.split(/\s+/);
                    let totalWords = words.length;
                    let currentX = margin;
                    let lineWidth = 0;
                    let wordWidths = []; // To store widths

                    // Calculate line width, account for bold
                    words.forEach(word => {
                        let isBold = boldWordList.some(boldWord => word.includes(boldWord));
                        doc.setFont("times", isBold ? "bold" : "normal");
                        let wordWidth = doc.getTextWidth(word);
                        wordWidths.push(wordWidth);
                        lineWidth += wordWidth;
                    });

                    let totalSpaces = totalWords - 1;
                    let extraSpace = totalSpaces > 0 ? (maxWidth - lineWidth) / totalSpaces : 0;

                    if (lineIndex < titleContentLines.length - 1 && totalWords > 1) {
                        // Justify all lines except the last
                        words.forEach((word, index) => {
                            let isBold = boldWordList.some(boldWord => word.includes(boldWord));
                            doc.setFont("times", isBold ? "bold" : "normal");
                            doc.text(word, currentX, titleContentY);
                            currentX += wordWidths[index] + extraSpace;
                        });
                    } else {
                        // Left-align the last line
                        words.forEach((word, index) => { // Added index
                            let isBold = boldWordList.some(boldWord => word.includes(boldWord));
                            doc.setFont("times", isBold ? "bold" : "normal");
                            doc.text(word, currentX, titleContentY);
                            currentX += wordWidths[index] + doc.getTextWidth(" ");
                        });
                    }
                    titleContentY += 6;
                });
                titleContentY += 3;
            }

            currentY = titleContentY; // Start initial Y position
            doc.setFont("times", "normal");

            for (let i = 1; i <= content.length; i++) {
                if (!content[i - 1]?.PointNo) break; // Break if data is missing to avoid errors
                currentY += 2; // Add extra spacing between points
                currentY = that._checkPageBreak(currentY, bottomLimit, doc, topMargin, backImgX, backImgY, oModel);
                // Add Point Number and Point Title
                if (content[i - 1].PointTitle) {
                    doc.setFont("times", "bold");
                    doc.setTextColor(0, 111, 191);
                    doc.text(`${content[i - 1].PointNo}.`, margin + (paraMargin - 6), currentY);
                    doc.text(content[i - 1].PointTitle, margin + paraMargin, currentY);
                    doc.setTextColor(0, 0, 0);
                    doc.setFont("times", "normal");
                    currentY += 10; // Increment Y position for the content section
                }
                else {
                    doc.text(`${content[i - 1].PointNo}.`, margin + (paraMargin - 6), currentY);
                }
                let pointContentY = currentY;
                let pointContentTemplate = new Function("oCompanyModel", "oModel", `return ${content[i - 1].PointDesc};`)(oCompanyModel, oModel);

                let pointContentParas = pointContentTemplate.split(`\n\n`); // Split content by paragraphs

                // Loop through each paragraph in the PointDesc
                pointContentParas.forEach((paragraph) => {
                    let pointContentLines = doc.splitTextToSize(paragraph, maxWidth - paraMargin); // Break paragraph into lines

                    pointContentLines.forEach((line, lineIndex) => {
                        let words = line.split(" ");
                        let totalWords = words.length;

                        // Calculate line width and space width
                        let lineWidth = doc.getTextWidth(line);
                        let spaceWidth = doc.getTextWidth(" ");

                        // Apply the page-break check
                        pointContentY = that._checkPageBreak(pointContentY, bottomLimit, doc, topMargin, backImgX, backImgY, oModel);

                        if (lineIndex < pointContentLines.length - 1) {
                            // Justify all lines except the last line of each paragraph
                            let extraSpace = totalWords > 1 ? ((maxWidth - paraMargin) - lineWidth) / (totalWords - 1) : 0;
                            let currentX = margin + paraMargin;

                            words.forEach((word, index) => {
                                doc.text(word, currentX, pointContentY);
                                currentX += doc.getTextWidth(word) + spaceWidth + (index < totalWords - 1 ? extraSpace : 0);
                            });
                        } else {
                            // Last line of the paragraph left-aligned
                            doc.text(line, margin + paraMargin, pointContentY);
                        }

                        pointContentY += 6; // Increment Y position after each line
                    });

                    pointContentY += 3; // Add extra spacing between paragraphs
                });

                currentY = pointContentY; // Update Y position for the next PointTitle
            }

            let pointContentLastY = currentY + 5;
            if (pointContentLastY > bottomLimit - 60) {
                doc.addPage();
                doc.addImage(oModel.CompanyLogoHeader, "PNG", 130, 8, 60, 13);
                doc.setGState(new doc.GState({ opacity: 0.2 }));
                doc.addImage(oModel.CompanyBackImage, "PNG", backImgX, backImgY, 100, 100);
                doc.setGState(new doc.GState({ opacity: 1 }));
                pointContentLastY = topMargin;
            }
            doc.setFont("times", "bold");
            var pointContentLast = `Understood and agreed to by the duly authorized representative of ${oCompanyModel.companyName} and ${oModel.ClientCompanyName}`;
            let pointContentLastLines = doc.splitTextToSize(pointContentLast, maxWidth);
            pointContentLastLines.forEach((line) => {
                doc.text(line, margin, pointContentLastY);
                pointContentLastY += 6;
            });

            let forCoNameY = pointContentLastY + 10;
            doc.text(`For ${oCompanyModel.companyName}`, margin, forCoNameY);
            doc.text("By:", margin, forCoNameY + 5);

            let headofCoNameY = forCoNameY + 30;
            doc.text(oCompanyModel.headOfCompany, margin, headofCoNameY);

            doc.setFont("times", "normal");
            let headofCoRoleY = headofCoNameY + 5;
            doc.text(oCompanyModel.designation, margin, headofCoRoleY);
            doc.text(oModel.AgreementDate, margin, headofCoRoleY + 5);

            doc.setFont("times", "bold");
            doc.text(`For ${oModel.ClientCompanyName}`, pageMiddle + 10, forCoNameY);
            doc.text("By:", pageMiddle + 10, forCoNameY + 5);

            doc.text(oModel.ClientName, pageMiddle + 10, headofCoNameY);

            doc.setFont("times", "normal");
            doc.text(oModel.ClientRole, pageMiddle + 10, headofCoRoleY);
            doc.text(oModel.AgreementDate, pageMiddle + 10, headofCoRoleY + 5);
        },
        
        _GenerateAgreementPDF: function (oModel, oCompanyModel, contentNDA, contentMSA) {
            var that = this;
            setTimeout(function () {
                var { jsPDF } = window.jspdf;
                var doc = new jsPDF({
                    unit: "mm",
                    format: "a4",
                    margins: { left: 30, right: 30 },
                    lineHeight: 1.5,
                    orientation: "portrait",
                });

                var pageWidth = doc.internal.pageSize.getWidth();
                var pageHeight = doc.internal.pageSize.getHeight();
                var margin = 25; // left and right margin
                var paraMargin = 6; // left margin for paragraphs
                var topMargin = 35;
                var footerHeight = 25; // reserve 25 units at the bottom for footer
                var maxWidth = pageWidth - 2 * margin; // usable width
                var pageMiddle = pageWidth / 2;
                var bottomLimit = pageHeight - footerHeight;
                let currentY = topMargin;

                const backImgX = (pageWidth - 100) / 2; // Center horizontally
                const backImgY = (pageHeight - 100) / 2; // Center vertically

                that._pdfContent(that, doc, pageWidth, pageHeight, margin, paraMargin, topMargin, maxWidth, pageMiddle, bottomLimit, currentY, backImgX, backImgY, oModel, oCompanyModel, contentNDA);
                doc.addPage();
                that._pdfContent(that, doc, pageWidth, pageHeight, margin, paraMargin, topMargin, maxWidth, pageMiddle, bottomLimit, currentY, backImgX, backImgY, oModel, oCompanyModel, contentMSA);
                doc.save(`${oCompanyModel.companyName} - ${oModel.ClientCompanyName} MSA & NDA.pdf`);
                sap.ui.core.BusyIndicator.hide();
            }, 1000);
        },

        _GenerateContractPDF: function (oModel, oCompanyModel, content) {
            var that = this;
            setTimeout(function () {
                var { jsPDF } = window.jspdf;
                var doc = new jsPDF({
                    unit: "mm",
                    format: "a4",
                    margins: { left: 30, right: 30 },
                    lineHeight: 1.5,
                    orientation: "portrait",
                });

                var pageWidth = doc.internal.pageSize.getWidth();
                var pageHeight = doc.internal.pageSize.getHeight();
                var margin = 25; // left and right margin
                var paraMargin = 6; // left margin for paragraphs
                var topMargin = 35;
                var footerHeight = 25; // reserve 25 units at the bottom for footer
                var maxWidth = pageWidth - 2 * margin; // usable width
                var pageMiddle = pageWidth / 2;
                var bottomLimit = pageHeight - footerHeight;
                let currentY = topMargin;

                const backImgX = (pageWidth - 100) / 2; // Center horizontally
                const backImgY = (pageHeight - 100) / 2; // Center vertically

                that._pdfContent(that, doc, pageWidth, pageHeight, margin, paraMargin, topMargin, maxWidth, pageMiddle, bottomLimit, currentY, backImgX, backImgY, oModel, oCompanyModel, content);
                doc.save(`${oCompanyModel.companyName} - ${oModel.ClientCompanyName} MSA & NDA.pdf`);
                sap.ui.core.BusyIndicator.hide();
            }, 1000);
        },

        _GenerateSOWPDF: function (oModel, oCompanyModel, content) {
            setTimeout(function () {

                var { jsPDF } = window.jspdf;
                var doc = new jsPDF({
                    unit: "mm",
                    format: "a4",
                    margins: { left: 30, right: 30 },
                    lineHeight: 1.5,
                    orientation: "portrait",
                });

                var pageWidth = doc.internal.pageSize.getWidth();
                var pageHeight = doc.internal.pageSize.getHeight();
                var margin = 25; // left and right margin
                var paraMargin = 6; // left margin for paragraphs
                var topMargin = 35;
                var footerHeight = 25; // reserve 25 units at the bottom for footer
                var maxWidth = pageWidth - 2 * margin; // usable width
                var pageMiddle = pageWidth / 2;
                var bottomLimit = pageHeight - footerHeight;
                let currentY;

                const backImgX = (pageWidth - 100) / 2; // Center horizontally
                const backImgY = (pageHeight - 100) / 2; // Center vertically

                function checkPageBreak(currentYPosition) {

                    if (currentYPosition >= bottomLimit) {
                        doc.addPage(); // Add a new page if the current position exceeds the limit
                        doc.addImage(oModel.CompanyLogoHeader, "PNG", 125, 8, 65, 14.5);
                        doc.setGState(new doc.GState({ opacity: 0.2 }));
                        doc.addImage(oModel.CompanyBackImage, "PNG", backImgX, backImgY, 100, 100);
                        doc.setGState(new doc.GState({ opacity: 1 }));
                        currentYPosition = topMargin; // Reset to top margin on the new page
                    }
                    return currentYPosition; // Return updated Y position
                }

                doc.addImage(oModel.CompanyLogoHeader, "PNG", 125, 8, 65, 14.5);
                doc.setGState(new doc.GState({ opacity: 0.2 }));
                doc.addImage(oModel.CompanyBackImage, "PNG", backImgX, backImgY, 100, 100);
                doc.setGState(new doc.GState({ opacity: 1 }));
                doc.setFont("helvetica", "bold").setFontSize(9);
                let subtitletextWidth = doc.getTextWidth("Master Service Agreement");
                let subtitleX = (pageWidth - subtitletextWidth) / 2;
                doc.text("Master Service Agreement", subtitleX, topMargin - 8);
                doc.line(subtitleX, topMargin - 7, subtitleX + subtitletextWidth + 1, topMargin - 7);
                let titleY = topMargin;
                let titleText = content[0].Title;
                doc.setFont("helvetica", "bold").setFontSize(12);
                let titletextWidth = doc.getTextWidth(titleText);
                let titleX = (pageWidth - titletextWidth) / 2;
                doc.text(titleText, titleX, titleY);
                doc.line(titleX, titleY + 1, titleX + titletextWidth + 1, titleY + 1);
                doc.setFont("helvetica", "normal").setFontSize(11);

                let titleContent1Y = titleY + 10; // Initial Y position after titleY
                const boldWords = ["AND", `${oCompanyModel.companyName}`, "NON-DISCLOSURE AGREEMENT", "India", `${oCompanyModel.headOfCompany} - ${oCompanyModel.designation}`, `${oModel.ClientCompanyName}`, "Company", "Other Party", "Disclosing Party", "Receiving Party", "Contractor", "(SOW)"];
                const boldWordList = boldWords.join(" ").split(" ");

                function titleContent(i, titleContentY) {
                    let titleContent = new Function("oCompanyModel", "oModel", `return ${content[i].TitleContent};`)(oCompanyModel, oModel);
                    let titleContentLines = doc.splitTextToSize(titleContent, maxWidth);
                    titleContentLines.forEach((line, lineIndex) => {
                        let words = line.split(/\s+/);
                        let totalWords = words.length;
                        let currentX = margin;
                        let lineWidth = 0;
                        let wordWidths = []; // To store widths

                        // Calculate line width, account for bold
                        words.forEach(word => {
                            let isBold = boldWordList.some(boldWord => word.includes(boldWord));
                            doc.setFont("helvetica", isBold ? "bold" : "normal");
                            let wordWidth = doc.getTextWidth(word);
                            wordWidths.push(wordWidth);
                            lineWidth += wordWidth;
                        });

                        let totalSpaces = totalWords - 1;
                        let extraSpace = totalSpaces > 0 ? (maxWidth - lineWidth) / totalSpaces : 0;

                        if (lineIndex < titleContentLines.length - 1 && totalWords > 1) {
                            // Justify all lines except the last
                            words.forEach((word, index) => {
                                let isBold = boldWordList.some(boldWord => word.includes(boldWord));
                                doc.setFont("helvetica", isBold ? "bold" : "normal");
                                doc.text(word, currentX, titleContentY);
                                currentX += wordWidths[index] + extraSpace;
                            });
                        } else {
                            // Left-align the last line
                            words.forEach((word, index) => { // Added index
                                let isBold = boldWordList.some(boldWord => word.includes(boldWord));
                                doc.setFont("helvetica", isBold ? "bold" : "normal");
                                doc.text(word, currentX, titleContentY);
                                currentX += wordWidths[index] + doc.getTextWidth(" ");
                            });
                        }
                        titleContentY += 6;
                    });
                    return titleContentY + 5; // Return updated Y position
                }

                let title2Y = titleContent(0, titleContent1Y); // Call for the first title content
                doc.setFont("helvetica", "bold");
                doc.text(content[1].Title, margin, title2Y); // Add the second title
                doc.setFont("helvetica", "normal");
                let titleContent2Y = title2Y + 6; // Initial Y position after title2Y
                let Title3Y = titleContent(1, titleContent2Y); // Call for the second title content
                doc.setFont("helvetica", "bold");
                doc.text(content[2].Title, margin, Title3Y + 3); // Add the third title
                currentY = Title3Y + 8; // Initial Y position after Title3Y

                for (let i = 1; i < content.length; i++) {
                    currentY += 5;
                    currentY = checkPageBreak(currentY);

                    // Point number and title
                    doc.text(`${content[i - 1].PointNo}.`, margin + (paraMargin - 6), currentY);

                    let pointContentLines = doc.splitTextToSize(content[i - 1].PointTitle, maxWidth - 6);
                    pointContentLines.forEach((line) => {
                        doc.text(line, margin + paraMargin, currentY);
                        currentY += 6;
                    });
                    currentY -= 6;

                    let pointTitleWidth = doc.getTextWidth(content[i - 1].PointTitle);
                    let pointContentX = margin + paraMargin + pointTitleWidth + 2;

                    // Dynamic widths
                    let firstLineWidth = pageWidth - pointContentX - margin;
                    let remainingLineWidth = pageWidth - 2 * margin - paraMargin;

                    doc.setFont("helvetica", "normal");
                    let pointContentTemplate = new Function("oCompanyModel", "oModel", `return ${content[i - 1].PointDesc};`)(oCompanyModel, oModel);

                    if (pointContentTemplate === "Table") {
                        const pageHeight = doc.internal.pageSize.height;
                        const lineHeight = 6;
                        const rowHeight = 6;
                        const headingFontSize = 8.5;
                        const bodyFontSize = 8;

                        // Column definitions
                        const columns = [
                            { title: "Sl\nNo", widthRatio: 0.08 },
                            { title: "Details of Assigned\nIT Personnel", widthRatio: 0.4 },
                            { title: "Designation", widthRatio: 0.3 },
                            { title: "Rate Card", widthRatio: 0.2 }
                        ];

                        const tableStartX = margin + 6;
                        const tableMaxWidth = pageWidth - tableStartX - margin;
                        const columnWidths = columns.map(col => col.widthRatio * tableMaxWidth);
                        const columnXPositions = columnWidths.reduce((acc, width, i) => {
                            acc.push((acc[i - 1] || tableStartX) + (i ? columnWidths[i - 1] : 0));
                            return acc;
                        }, []);

                        // Draw Header Background
                        let firstLineY = currentY + 6;
                        let secondLineY = firstLineY + 8;
                        doc.setLineWidth(1).setDrawColor(231, 166, 0);
                        doc.line(tableStartX, firstLineY, pageWidth - margin, firstLineY);
                        doc.line(tableStartX, secondLineY, pageWidth - margin, secondLineY);
                        doc.setFillColor(255, 207, 84);
                        doc.rect(tableStartX, firstLineY, tableMaxWidth, secondLineY - firstLineY, 'F');

                        // Header Text
                        doc.setFont("helvetica", "bold").setFontSize(headingFontSize);
                        const headingY = firstLineY + 3;
                        columns.forEach((col, i) => {
                            const lines = col.title.split("\n");
                            lines.forEach((line, j) => {
                                doc.text(line, columnXPositions[i] + 1, headingY + (j * 4));
                            });
                        });

                        // Table Body
                        doc.setFont("helvetica", "normal").setFontSize(bodyFontSize);
                        const tableData = oModel.TableData;
                        let tableDataY = secondLineY + 4.5;

                        for (let i = 0; i < tableData.length; i++) {
                            const { Salutation, ConsultantName, Designation, Rate } = tableData[i];
                            const rowValues = [i+1, Salutation + " " + ConsultantName, Designation, Rate];
                        
                            // Wrap text for each cell and calculate line count
                            const wrappedLines = rowValues.map((val, j) => doc.splitTextToSize(val, columnWidths[j] - 2));
                            const lineCounts = wrappedLines.map(lines => lines.length);
                            const maxLineCount = Math.max(...lineCounts);
                            const dynamicRowHeight = maxLineCount * 4.5; // Adjust line height as needed
                        
                            // Check for page overflow
                            if (tableDataY + dynamicRowHeight > pageHeight - margin) {
                                doc.addPage();
                                tableDataY = margin;
                            }
                        
                            // Background fill
                            doc.setFillColor(255, 237, 194);
                            doc.rect(tableStartX, tableDataY-4, tableMaxWidth, dynamicRowHeight, 'F');
                        
                            // Draw text cell by cell
                            wrappedLines.forEach((lines, j) => {
                                for (let k = 0; k < lines.length; k++) {
                                    doc.text(lines[k], columnXPositions[j] + 1, (tableDataY + (k * 4) - 1));
                                }
                            });
                        
                            // Bottom line
                            if(i == tableData.length - 1) doc.setLineWidth(0.5);
                            doc.line(tableStartX, tableDataY + dynamicRowHeight-4, pageWidth - margin, tableDataY + dynamicRowHeight-4);
                        
                            // Move to next row
                            tableDataY += dynamicRowHeight;
                        }                        

                        // Reset and update Y position
                        doc.setDrawColor(0, 0, 0);
                        currentY = tableDataY + 4;
                        doc.setFont("helvetica", "bold").setFontSize(11);
                        continue;
                    }

                    // Split manually: we process line-by-line depending on the width
                    let allWords = pointContentTemplate.split(" ");
                    let lines = [];
                    let line = "";
                    let isFirstLine = true;
                    allWords.forEach((word) => {
                        let testLine = line.length ? line + " " + word : word;
                        let testWidth = doc.getTextWidth(testLine);
                        let maxWidth = isFirstLine ? firstLineWidth : remainingLineWidth;

                        if (testWidth <= maxWidth) {
                            line = testLine;
                        } else {
                            lines.push(line);
                            line = word;
                            isFirstLine = false;
                        }
                    });
                    if (line) lines.push(line); // Push last line

                    // Print lines
                    lines.forEach((lineText, index) => {
                        let lineX = index === 0 ? pointContentX : margin + paraMargin;
                        currentY = checkPageBreak(currentY);
                        doc.text(lineText, lineX, currentY);
                        currentY += 6;
                    });

                    doc.setFont("helvetica", "bold");
                }

                let lastPointTitleY = currentY + 5;
                doc.text(`${content[15].PointNo}.`, margin + (paraMargin - 6), lastPointTitleY);
                doc.text(content[15].PointTitle, margin + paraMargin, lastPointTitleY);

                doc.setFont("helvetica", "normal");

                let lastPointContentY = lastPointTitleY + 10;
                let lastPointContentTemplate = new Function("oCompanyModel", "oModel", `return ${content[15].PointDesc};`)(oCompanyModel, oModel);

                let lastPointContentParas = lastPointContentTemplate.split(`\n\n`);

                lastPointContentParas.forEach((paragraph) => {
                    let pointContentLines = doc.splitTextToSize(paragraph, maxWidth - paraMargin);

                    pointContentLines.forEach((line, lineIndex) => {
                        let words = line.split(" ");
                        let totalWords = words.length;
                        let lineWidth = doc.getTextWidth(line);
                        let spaceWidth = doc.getTextWidth(" ");

                        lastPointContentY = checkPageBreak(lastPointContentY);

                        if (lineIndex < pointContentLines.length - 1 && totalWords > 1) {
                            let extraSpace = ((maxWidth - paraMargin) - lineWidth) / (totalWords - 1);
                            let currentX = margin + paraMargin;

                            words.forEach((word, index) => {
                                doc.text(word, currentX, lastPointContentY);
                                currentX += doc.getTextWidth(word) + spaceWidth + (index < totalWords - 1 ? extraSpace : 0);
                            });
                        } else {
                            doc.text(line, margin + paraMargin, lastPointContentY);
                        }

                        lastPointContentY += 6;
                    });

                    lastPointContentY += 3;
                });

                currentY = lastPointContentY; // Update Y for next block
                doc.setFont("times", "bold");
                let pointContentLastY = currentY + 5;
                if (pointContentLastY > bottomLimit - 60) {
                    doc.addPage();
                    doc.addImage(oModel.CompanyLogoHeader, "PNG", 130, 8, 60, 13);
                    doc.setGState(new doc.GState({ opacity: 0.2 }));
                    doc.addImage(oModel.CompanyBackImage, "PNG", backImgX, backImgY, 100, 100);
                    doc.setGState(new doc.GState({ opacity: 1 }));
                    pointContentLastY = topMargin;
                }
                var pointContentLast = `Understood and agreed to by the duly authorized representative of ${oCompanyModel.companyName} and ${oModel.ClientCompanyName}`;
                let pointContentLastLines = doc.splitTextToSize(pointContentLast, maxWidth);
                pointContentLastLines.forEach((line) => {
                    doc.text(line, margin, pointContentLastY);
                    pointContentLastY += 6;
                });

                let forCoNameY = pointContentLastY + 10;
                doc.text(`For ${oCompanyModel.companyName}`, margin, forCoNameY);
                doc.text("By:", margin, forCoNameY + 5);

                let headofCoNameY = forCoNameY + 30;
                doc.text(oCompanyModel.headOfCompany, margin, headofCoNameY);

                doc.setFont("times", "normal");
                let headofCoRoleY = headofCoNameY + 5;
                doc.text(oCompanyModel.designation, margin, headofCoRoleY);
                doc.text(oModel.AgreementDate, margin, headofCoRoleY + 5);

                doc.setFont("times", "bold");
                doc.text(`For ${oModel.ClientCompanyName}`, pageMiddle + 10, forCoNameY);
                doc.text("By:", pageMiddle + 10, forCoNameY + 5);

                doc.text(oModel.ClientName, pageMiddle + 10, headofCoNameY);

                doc.setFont("times", "normal");
                doc.text(oModel.ClientRole, pageMiddle + 10, headofCoRoleY);
                doc.text(oModel.AgreementDate, pageMiddle + 10, headofCoRoleY + 5);

                doc.save("SOW.pdf");
                sap.ui.core.BusyIndicator.hide();
            }, 1000);
        }
    };
});
sap.ui.define([], function () {
    "use strict";
    return {
        _GenerateAgreementPDF: function (oModel, oCompanyModel, contentNDA, contentMSA) {
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

            function pdfContent(content) {
                doc.addImage(oModel.CompanyLogoHeader, "PNG", 125, 8, 65, 14.5);
                doc.setGState(new doc.GState({ opacity: 0.2 }));
                doc.addImage(oModel.CompanyBackImage, "PNG", backImgX, backImgY, 100, 100);
                doc.setGState(new doc.GState({ opacity: 1 }));
                let titleY = topMargin;
                let titleText = content[0].Title;
                doc.setFont("times", "bold").setFontSize(12);
                let textWidth = doc.getTextWidth(titleText);
                let titleX = (pageWidth - textWidth) / 2;
                doc.text(titleText, titleX, titleY);
                doc.setFont("times", "normal").setFontSize(11);

                let titleContentY = titleY + 10; // Initial Y position after titleY
                const boldWords = ["AND", `${oCompanyModel.companyName}`, "NON-DISCLOSURE AGREEMENT", "India", `${oCompanyModel.headOfCompany} - ${oCompanyModel.designation}`, `${oModel.ClientCompanyName}`, "Company", "Other Party", "Disclosing Party", "Receiving Party", "Contractor", "(SOW)"];
                const boldWordList = boldWords.join(" ").split(" ");

                for (let i = 0; i < 10; i++) {
                    if (oModel.StipendSkipLine && i === oModel.StipendSkipLine - 1) continue;
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
                doc.setFont("times", "bold");

                const maxPoints = 25; // Loop limit to handle up to 25 points

                for (let i = 1; i <= maxPoints; i++) {
                    if (!content[i - 1]?.PointNo || !content[i - 1]?.PointTitle) break; // Break if data is missing to avoid errors
                    currentY += 2; // Add extra spacing between points
                    currentY = checkPageBreak(currentY);
                    // Add Point Number and Point Title
                    doc.setTextColor(0, 111, 191);
                    doc.text(`${content[i - 1].PointNo}.`, margin + (paraMargin - 6), currentY);
                    doc.text(content[i - 1].PointTitle, margin + paraMargin, currentY);
                    doc.setTextColor(0, 0, 0);

                    doc.setFont("times", "normal");
                    currentY += 10; // Increment Y position for the content section

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
                            pointContentY = checkPageBreak(pointContentY);

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
                    doc.setFont("times", "bold");
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
            }

            pdfContent(contentNDA);
            doc.addPage();
            pdfContent(contentMSA);
            doc.save(`${oCompanyModel.companyName} - ${oModel.ClientCompanyName} MSA & NDA.pdf`);
            sap.ui.core.BusyIndicator.hide();}, 1000);
        }
    };
});
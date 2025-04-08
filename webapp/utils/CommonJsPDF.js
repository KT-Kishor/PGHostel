sap.ui.define([], function () {
    "use strict";
    return {
        _GeneratePDF: function (oModel, oCompanyModel, content) {
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
            var topMargin = 30;
            var footerHeight = 25; // reserve 25 units at the bottom for footer
            var maxWidth = pageWidth - 2 * margin; // usable width
            var pageMiddle = pageWidth / 2;
            let currentYPosition = 10; // Initial Y Position
            const backImgX = (pageWidth - 100) / 2; // Center horizontally
            const backImgY = (pageHeight - 100) / 2; // Center vertically
            const bottomLimit = pageHeight - footerHeight;
            let currentY;

            function checkPageBreak(currentYPosition) {

                if (currentYPosition >= bottomLimit) {
                    doc.addPage(); // Add a new page if the current position exceeds the limit
                    doc.addImage(oModel.CompanyLogoHeader, "PNG", 145, 8, 45, 10);
                    doc.setGState(new doc.GState({ opacity: 0.2 }));
                    doc.addImage(oModel.CompanyBackImage, "PNG", backImgX, backImgY, 100, 100);
                    doc.setGState(new doc.GState({ opacity: 1 }));
                    currentYPosition = topMargin; // Reset to top margin on the new page
                }
                return currentYPosition; // Return updated Y position
            }

            doc.addImage(oCompanyModel.companylogo64, "PNG", margin, currentYPosition, 45, 45);
            doc.setGState(new doc.GState({ opacity: 0.2 }));
            doc.addImage(oModel.CompanyBackImage, "PNG", backImgX, backImgY, 100, 100);
            doc.setGState(new doc.GState({ opacity: 1 }));
            doc.setFontSize(12);

            let addressLines = doc.splitTextToSize(
                oCompanyModel.longAddress,
                80
            );
            let addressY = currentYPosition + 20;
            addressLines.forEach((line) => {
                let textWidth = doc.getTextWidth(line); // Measure text width
                let xPosition = pageWidth - textWidth - margin; // Align to right

                doc.text(line, xPosition, addressY);
                addressY += 6.5;
            });

            let mobileNo = oCompanyModel.mobileNo;
            let mobileWidth = doc.getTextWidth(mobileNo);
            let mobileX = pageWidth - mobileWidth - margin;
            doc.text(mobileNo, mobileX, addressY);

            let emailY = addressY + 6.5;
            let carrerEmail = oCompanyModel.carrerEmail;
            let carrerEmailWidth = doc.getTextWidth(carrerEmail);
            let emailX = pageWidth - carrerEmailWidth - margin;
            doc.text(carrerEmail, emailX, emailY);

            doc.setFont("times").setFontSize(12);
            let dateY = emailY + 6.5;
            doc.text(oModel.CreateDate, margin, dateY);

            let currentAfterDateY = dateY;
            if (oModel.Type === "EmployeeOffer") {
                doc.setFont("times", "bold");
                let empNameY = currentAfterDateY + 10;
                doc.text(oModel.EmpName, margin, empNameY);

                doc.setFont("times", "normal");
                let empRoleY = empNameY + 6.5;
                doc.text(oModel.EmpRole, margin, empRoleY);

                let empAddressLines = doc.splitTextToSize(
                    oModel.EmpAddress,
                    65
                );
                let empAddressY = empRoleY + 6.5;
                empAddressLines.forEach((line) => {
                    doc.text(line, margin, empAddressY);
                    empAddressY += 6;
                });
                currentAfterDateY = empAddressY - 6;
            }

            let titleY = currentAfterDateY + 11;
            let titleText = content[0].Title;
            doc.setFont("times", "bold").setFontSize(14);
            let textWidth = doc.getTextWidth(titleText);
            let titleX = (pageWidth - textWidth) / 2;
            doc.text(titleText, titleX, titleY);
            doc.setFont("times", "normal").setFontSize(12.5);

            let titleContentY = titleY + 10; // Initial Y position after titleY

            for (let i = 0; i < 10; i++) {
                if (oModel.StipendSkipLine && i === oModel.StipendSkipLine - 1) continue;
                if (!content[i]?.TitleContent) break;  // Break the loop if TitleContent doesn't exist
            
                // Evaluate TitleContent dynamically
                let titleContent = new Function("oCompanyModel", "oModel", `return ${content[i].TitleContent};`)(oCompanyModel, oModel);
                let titleContentLines = doc.splitTextToSize(titleContent, maxWidth);
            
                titleContentLines.forEach((line, lineIndex) => {
                    let words = line.split(" ");
                    let totalWords = words.length;
                    let lineWidth = doc.getTextWidth(line);
                    let spaceWidth = doc.getTextWidth(" ");
                    let currentX = margin;
            
                    if (lineIndex < titleContentLines.length - 1) {
                        // Justify all lines except the last line
                        let extraSpace = totalWords > 1 ? (maxWidth - lineWidth) / (totalWords - 1) : 0;
            
                        words.forEach((word, index) => {
                            // Check if the word should be bold
                            if (word === "WHEREAS" || word.includes("Kalpavriksha Technologies")) {
                                doc.setFont("times", "bold");
                            } else {
                                doc.setFont("times", "normal");
                            }
            
                            doc.text(word, currentX, titleContentY);
                            currentX += doc.getTextWidth(word) + spaceWidth + (index < totalWords - 1 ? extraSpace : 0);
                        });
            
                    } else {
                        // Left-align the last line of the paragraph
                        words.forEach((word) => {
                            if (word === "WHEREAS" || word.includes("Kalpavriksha Technologies")) {
                                doc.setFont("times", "bold");
                            } else {
                                doc.setFont("times", "normal");
                            }
            
                            doc.text(word, currentX, titleContentY);
                            currentX += doc.getTextWidth(word) + spaceWidth;
                        });
                    }
            
                    titleContentY += 6.2; // Move down after each line
                });
            
                titleContentY += 5.5;  // Add extra spacing after each block of TitleContent
            }            

            let contentafterTitleContentY = titleContentY;
            if (oModel.Type === "EmployeeOffer") {
                doc.setFont("times", "bold");
                let title3Y = contentafterTitleContentY + 2;
                let title3 = new Function("oModel", `return ${content[2].Title};`)(oModel);
                doc.text(title3, margin, title3Y);

                let title4Y = title3Y + 11;
                let title4 = new Function("oModel", `return ${content[3].Title};`)(oModel);
                doc.text(title4, margin, title4Y);

                currentY = title4Y + 11; // Start initial Y position
                doc.setFont("times", "bold");

                const maxPoints = 25; // Loop limit to handle up to 25 points

                for (let i = 1; i <= maxPoints; i++) {
                    if (!content[i - 1]?.PointNo || !content[i - 1]?.PointTitle) break; // Break if data is missing to avoid errors
                    currentY += 3; // Add extra spacing between points
                    currentY = checkPageBreak(currentY);
                    // Add Point Number and Point Title
                    doc.setTextColor(0, 111, 191);
                    doc.text(`${content[i - 1].PointNo}.`, margin + (paraMargin - 6), currentY);
                    doc.text(content[i - 1].PointTitle, margin + paraMargin, currentY);
                    doc.setTextColor(0, 0, 0);

                    doc.setFont("times", "normal");
                    currentY += 11; // Increment Y position for the content section

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

                            pointContentY += 6.2; // Increment Y position after each line
                        });

                        pointContentY += 3; // Add extra spacing between paragraphs
                    });

                    currentY = pointContentY; // Update Y position for the next PointTitle
                    doc.setFont("times", "bold");
                }
                contentafterTitleContentY = currentY;
            }

            if (oModel.Type === "EmployeeOffer") {
                if (contentafterTitleContentY > bottomLimit - 90) {
                    doc.addPage();
                    doc.addImage(oModel.CompanyLogoHeader, "PNG", 145, 8, 45, 10);
                    doc.setGState(new doc.GState({ opacity: 0.2 }));
                    doc.addImage(oModel.CompanyBackImage, "PNG", backImgX, backImgY, 100, 100);
                    doc.setGState(new doc.GState({ opacity: 1 }));
                    contentafterTitleContentY = topMargin;
                }
            }

            doc.setFont("times", "bold").setFontSize(12);
            let forCoNameY = contentafterTitleContentY + 10;
            doc.text(`For ${oCompanyModel.companyName}.`, margin, forCoNameY);

            let coSignY = forCoNameY + 5;
            doc.addImage(oCompanyModel.signature64, "PNG", margin, coSignY, 57, 13);

            let headofCoNameY = coSignY + 20;
            doc.text(oCompanyModel.headOfCompany, margin, headofCoNameY);

            doc.setFont("times", "normal");
            let headofCoRoleY = headofCoNameY + 5;
            doc.text(oCompanyModel.designation, margin, headofCoRoleY);

            let acceptTCVisY = headofCoRoleY + 15;
            if (oModel.Type === "EmployeeOffer") {
                let acceptTCY = acceptTCVisY;
                doc.text("I have read and accept the terms and conditions:", margin, acceptTCY);
                acceptTCVisY = acceptTCY + 15;
            }

            let cNameY = acceptTCVisY;
            doc.text("Candidate Name: .................................................", margin, cNameY);

            let cJoinDate = cNameY + 11;
            doc.text("Date of Joining: ...................................................", margin, cJoinDate);

            let cSignY = cJoinDate + 11;
            doc.text("Signature: ............................................................", margin, cSignY);


            if (oModel.Type === "EmployeeOffer") {
                doc.addPage();
                doc.addImage(oModel.CompanyLogoHeader, "PNG", 145, 8, 45, 10);
                doc.setGState(new doc.GState({ opacity: 0.2 }));
                doc.addImage(oModel.CompanyBackImage, "PNG", backImgX, backImgY, 100, 100);
                doc.setGState(new doc.GState({ opacity: 1 }));

                let salPageHeader = oModel.PageHeader;
                doc.setFont("times", "bold").setFontSize(14);
                let salPageHeaderWidth = doc.getTextWidth(salPageHeader);
                let salPageHeaderX = (pageWidth - salPageHeaderWidth) / 2;
                doc.text(salPageHeader, salPageHeaderX, topMargin);

                let topLineY = topMargin + 10;
                doc.setLineWidth(0.5);
                doc.line(margin, topLineY, pageWidth - margin, topLineY);
                doc.setLineWidth(0.4);

                doc.setFont("helvetica", "bold");
                let salTitleY = topLineY + 5;
                let salTitle = oModel.Title;
                let salTitleWidth = doc.getTextWidth(salTitle);
                let salTitleX = (pageWidth - salTitleWidth) / 2;
                doc.text(salTitle, salTitleX, salTitleY);

                // Draw underline for salTitle
                doc.line(salTitleX, salTitleY + 1, salTitleX + salTitleWidth, salTitleY + 1); // Line below the title text

                let salSubTitleY = salTitleY + 12;
                let salSubTitle = oModel.SubTitle;
                let salSubTitleWidth = doc.getTextWidth(salSubTitle);
                let salSubTitleX = (pageWidth - salSubTitleWidth) / 2;
                doc.text(salSubTitle, salSubTitleX, salSubTitleY);

                // Draw underline for salSubTitle
                doc.line(salSubTitleX, salSubTitleY + 1, salSubTitleX + salSubTitleWidth, salSubTitleY + 1);
                doc.setLineWidth(0.5);

                var headers = oModel.Headers;
                doc.setFontSize(11);

                let headerY = salSubTitleY + 12; // Initial Y position

                for (let i = 1; i <= headers.length; i++) {
                    // Break the loop if Title or Text is missing
                    if (!headers[i - 1]?.Title || !headers[i - 1]?.Text) break;

                    // Draw Title with bold font
                    doc.setFont("helvetica", "bold");
                    doc.text(headers[i - 1].Title, margin + 5, headerY);

                    // Draw Text with normal font
                    doc.text(headers[i - 1].Text, pageMiddle + 10, headerY);

                    // Increment Y position for the next header (adjust as per line height)
                    headerY += 8;
                }

                doc.setLineWidth(1);
                doc.line(margin, headerY, pageWidth - margin, headerY);

                let monthlyCompTitleY = headerY + 5;
                doc.setFont("helvetica", "bold");
                let monthlyCompTitle = "Monthly Components (in INR)";
                let monthlyCompTitleWidth = doc.getTextWidth(monthlyCompTitle);
                let monthlyCompTitleX = (pageWidth - monthlyCompTitleWidth) / 2;
                let monthlyCompTitleBotLineY = monthlyCompTitleY + 2;
                doc.line(margin, monthlyCompTitleBotLineY, pageWidth - margin, monthlyCompTitleBotLineY);
                doc.setLineWidth(0.5);
                doc.setFillColor(191, 191, 191);
                doc.rect(margin, headerY, maxWidth, monthlyCompTitleBotLineY - headerY, 'F');
                doc.text(monthlyCompTitle, monthlyCompTitleX, monthlyCompTitleY);

                doc.setFont("helvetica", "normal");
                var monthlyComponents = oModel.MonthlyComponents;
                let monCurrentY = monthlyCompTitleBotLineY + 5;  // Initial Y position

                for (let i = 1; i <= monthlyComponents.length-1; i++) {

                    // Draw Title on the left
                    doc.text(monthlyComponents[i].Title, margin + 3, monCurrentY);

                    // Draw Text on the right, aligned to the right side
                    let compText = monthlyComponents[i].Text;
                    let compTextWidth = doc.getTextWidth(compText);
                    let compTextX = pageWidth - compTextWidth - margin - 3;
                    doc.text(compText, compTextX, monCurrentY);

                    // Draw a line under each item
                    let botLineY = monCurrentY + 2;
                    doc.line(margin, botLineY, pageWidth - margin, botLineY);

                    // Increment Y position for the next item
                    monCurrentY = botLineY + 5;
                }

                doc.setFont("helvetica", "bold");
                let monComp0Y = monCurrentY;
                doc.text(monthlyComponents[0].Title, margin + 3, monComp0Y);
                let monComp0Text = monthlyComponents[0].Text;
                let monComp0TextWidth = doc.getTextWidth(monComp0Text);
                let monComp0TextX = pageWidth - monComp0TextWidth - margin - 3;
                doc.text(monComp0Text, monComp0TextX, monComp0Y);
                let monComp0BotLineY = monComp0Y + 2;
                doc.setLineWidth(1);
                doc.line(margin, monComp0BotLineY, pageWidth - margin, monComp0BotLineY);

                let retrialsTitleY = monComp0BotLineY + 5;
                let retrialsTitle = "Retrials & Other Benefits (in INR)";
                let retrialsTitleWidth = doc.getTextWidth(retrialsTitle);
                let retrialsTitleX = (pageWidth - retrialsTitleWidth) / 2;
                let retrialsTitleBotLineY = retrialsTitleY + 2;
                doc.line(margin, retrialsTitleBotLineY, pageWidth - margin, retrialsTitleBotLineY);
                doc.setLineWidth(0.5);
                doc.setFillColor(191, 191, 191);
                doc.rect(margin, monComp0BotLineY, maxWidth, retrialsTitleBotLineY - monComp0BotLineY, 'F');
                doc.text(retrialsTitle, retrialsTitleX, retrialsTitleY);

                doc.setFont("helvetica", "normal");
                var retrials = oModel.Retrials;
                let retCurrentY = retrialsTitleBotLineY + 5;  // Initial Y position

                for (let i = 1; i <= retrials.length-1; i++) {

                    // Draw Title on the left
                    doc.text(retrials[i].Title, margin + 3, retCurrentY);

                    // Draw Text on the right, aligned to the right side
                    let compText = retrials[i].Text;
                    let compTextWidth = doc.getTextWidth(compText);
                    let compTextX = pageWidth - compTextWidth - margin - 3;
                    doc.text(compText, compTextX, retCurrentY);

                    // Draw a line under each item
                    let botLineY = retCurrentY + 2;
                    doc.line(margin, botLineY, pageWidth - margin, botLineY);

                    // Increment Y position for the next item
                    retCurrentY = botLineY + 5;
                }

                doc.setFont("helvetica", "bold");
                let retrials0Y = retCurrentY;
                doc.text(retrials[0].Title, margin + 3, retrials0Y);
                let retrials0Text = retrials[0].Text;
                let retrials0TextWidth = doc.getTextWidth(retrials0Text);
                let retrials0TextX = pageWidth - retrials0TextWidth - margin - 3;
                doc.text(retrials0Text, retrials0TextX, retrials0Y);
                let retrials0BotLineY = retrials0Y + 2;
                doc.setLineWidth(1);
                doc.line(margin, retrials0BotLineY, pageWidth - margin, retrials0BotLineY);

                let varCompTitleY = retrials0BotLineY + 5;
                let varCompTitle = "Variable Components (in INR)";
                let varCompTitleWidth = doc.getTextWidth(varCompTitle);
                let varCompTitleX = (pageWidth - varCompTitleWidth) / 2;
                let varCompTitleBotLineY = varCompTitleY + 2;
                doc.line(margin, varCompTitleBotLineY, pageWidth - margin, varCompTitleBotLineY);
                doc.setLineWidth(0.5);
                doc.setFillColor(191, 191, 191);
                doc.rect(margin, retrials0BotLineY, maxWidth, varCompTitleBotLineY - retrials0BotLineY, 'F');
                doc.text(varCompTitle, varCompTitleX, varCompTitleY);

                doc.setFont("helvetica", "normal");
                var varComp = oModel.VariableComponents;
                let varCompCurrentY = varCompTitleBotLineY + 5;  // Initial Y position

                for (let i = 1; i <= varComp.length-1; i++) {

                    // Draw Title on the left
                    doc.text(varComp[i].Title, margin + 3, varCompCurrentY);

                    // Draw Text on the right, aligned to the right side
                    let compText = varComp[i].Text;
                    let compTextWidth = doc.getTextWidth(compText);
                    let compTextX = pageWidth - compTextWidth - margin - 3;
                    doc.text(compText, compTextX, varCompCurrentY);

                    // Draw a line under each item
                    let botLineY = varCompCurrentY + 2;
                    doc.line(margin, botLineY, pageWidth - margin, botLineY);

                    // Increment Y position for the next item
                    varCompCurrentY = botLineY + 5;
                }

                doc.setFont("helvetica", "bold");
                let varComp0Y = varCompCurrentY;
                doc.text(varComp[0].Title, margin + 3, varComp0Y);
                let varComp0Text = varComp[0].Text;
                let varComp0TextWidth = doc.getTextWidth(varComp0Text);
                let varComp0TextX = pageWidth - varComp0TextWidth - margin - 3;
                doc.text(varComp0Text, varComp0TextX, varComp0Y);
                let varComp0BotLineY = varComp0Y + 2;
                doc.setLineWidth(1);
                doc.line(margin, varComp0BotLineY, pageWidth - margin, varComp0BotLineY);

                let deductionTitleY = varComp0BotLineY + 5;
                let deductionTitle = "Deductions (in INR)";
                let deductionTitleWidth = doc.getTextWidth(deductionTitle);
                let deductionTitleX = (pageWidth - deductionTitleWidth) / 2;
                let deductionTitleBotLineY = deductionTitleY + 2;
                doc.line(margin, deductionTitleBotLineY, pageWidth - margin, deductionTitleBotLineY);
                doc.setLineWidth(0.5);
                doc.setFillColor(191, 191, 191);
                doc.rect(margin, varComp0BotLineY, maxWidth, deductionTitleBotLineY - varComp0BotLineY, 'F');
                doc.text(deductionTitle, deductionTitleX, deductionTitleY);

                doc.setFont("helvetica", "normal");
                var deduction = oModel.TotalDeductions;
                let deductionCurrentY = deductionTitleBotLineY + 5;  // Initial Y position

                for (let i = 1; i <= deduction.length-1; i++) {

                    // Draw Title on the left
                    doc.text(deduction[i].Title, margin + 3, deductionCurrentY);

                    // Draw Text on the right, aligned to the right side
                    let compText = deduction[i].Text;
                    let compTextWidth = doc.getTextWidth(compText);
                    let compTextX = pageWidth - compTextWidth - margin - 3;
                    doc.text(compText, compTextX, deductionCurrentY);

                    // Draw a line under each item
                    let botLineY = deductionCurrentY + 2;
                    doc.line(margin, botLineY, pageWidth - margin, botLineY);

                    // Increment Y position for the next item
                    deductionCurrentY = botLineY + 5;
                }

                doc.setFont("helvetica", "bold");
                let deduction0Y = deductionCurrentY;
                doc.text(deduction[0].Title, margin + 3, deduction0Y);
                let deduction0Text = deduction[0].Text;
                let deduction0TextWidth = doc.getTextWidth(deduction0Text);
                let deduction0TextX = pageWidth - deduction0TextWidth - margin - 3;
                doc.text(deduction0Text, deduction0TextX, deduction0Y);
                let deduction0BotLineY = deduction0Y + 2;
                doc.line(margin, deduction0BotLineY, pageWidth - margin, deduction0BotLineY);

                let grossPayLineTopY = deduction0BotLineY + 7;
                doc.setLineWidth(1);
                doc.line(margin, grossPayLineTopY, pageWidth - margin, grossPayLineTopY);

                doc.setTextColor(255, 255, 255);
                let grossPayY = grossPayLineTopY + 5;
                let grossPayText = oModel.EmpCTC;
                let grossPayTextWidth = doc.getTextWidth(grossPayText);
                let grossPayTextX = pageWidth - grossPayTextWidth - margin - 3;
                let grossPayBotLineY = grossPayY + 2;
                doc.line(margin, grossPayBotLineY, pageWidth - margin, grossPayBotLineY);
                doc.setLineWidth(0.5);
                doc.setFillColor(128, 128, 128);
                doc.rect(margin, grossPayLineTopY, maxWidth, grossPayBotLineY - grossPayLineTopY, 'F');
                doc.text("COST TO COMPANY", margin + 3, grossPayY);
                doc.text(grossPayText, grossPayTextX, grossPayY);
                doc.setTextColor(0, 0, 0);

                doc.line(pageMiddle + 10, monthlyCompTitleBotLineY, pageMiddle + 10, monComp0BotLineY);
                doc.line(pageMiddle + 10, retrialsTitleBotLineY, pageMiddle + 10, retrials0BotLineY);
                doc.line(pageMiddle + 10, varCompTitleBotLineY, pageMiddle + 10, varComp0BotLineY);
                doc.line(pageMiddle + 10, deductionTitleBotLineY, pageMiddle + 10, grossPayBotLineY);
                doc.line(margin, topLineY, margin, grossPayBotLineY);
                doc.line(pageWidth - margin, topLineY, pageWidth - margin, grossPayBotLineY);

                doc.setFontSize(12);
                let salNoteTitleY = grossPayBotLineY + 10;
                salNoteTitleY = checkPageBreak(salNoteTitleY);
                var salNotes = oModel.Notes;
                doc.text("NOTE:", margin, salNoteTitleY);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(11);

                let salNoteTextY = salNoteTitleY + 8; // Initial Y position after salNoteTitleY

                for (let i = 1; i <= salNotes.length; i++) {
                    if (!salNotes[i]?.Text) break;  // Break loop if no text exists at index i

                    let salNotesTextLines = doc.splitTextToSize(salNotes[i].Text, maxWidth - 5); // Split text into lines
                    salNoteTextY = checkPageBreak(salNoteTextY); // Apply page-break check

                    salNotesTextLines.forEach((line) => {
                        doc.text(line, margin + 5, salNoteTextY);  // Draw each line of text
                        salNoteTextY += 6;  // Increment Y position for the next line
                    });

                    salNoteTextY += 3;  // Add extra spacing between blocks
                }

                if (salNotes[0].Text != "0") {
                    doc.setFont("helvetica", "bold").setFontSize(12);
                    let salNoteText0Y = salNoteTextY + 3;
                    doc.text(`${salNotes[0].Title} ${salNotes[0].Text}`, margin, salNoteText0Y);
                }
            }
            doc.save(`${oModel.EmpName} Offer Letter.pdf`);
            sap.ui.core.BusyIndicator.hide();}, 1000);
        }
    };
});
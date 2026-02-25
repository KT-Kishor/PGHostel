sap.ui.define([
    "sap/ui/core/format/DateFormat"
], function (DateFormat) {
    "use strict";
    function parseDDMMYYYY(sDate) {
        if (!sDate) return null;
        // Expected input: "19/11/2025"
        const parts = sDate.split("/");
        if (parts.length !== 3) return null;
        const [day, month, year] = parts.map(Number);
        return new Date(year, month - 1, day); // JS months are 0-based
    }
    return {
        formatDate: function (sDate) {
            if (sDate) {
                var oDateFormat = DateFormat.getDateInstance({
                    pattern: "dd/MM/yyyy"
                });
                return oDateFormat.format(new Date(sDate));
            }
            return sDate;
        },

        calculateFacilityTotal: function (fPrice, iDays) {
            if (!fPrice || !iDays) return "₹ 0";
            const fTotal = parseFloat(fPrice) * parseInt(iDays);
            return "₹ " + fTotal.toFixed(2);
        },

        // formatCurrency: function(fValue) {
        //     if (!fValue) return "₹ 0.00";
        //     return "₹ " + parseFloat(fValue).toFixed(2);
        // },

        calculateDays: function (sStartDate, sEndDate) {
            if (!sStartDate || !sEndDate) return 0;

            const aParts1 = sStartDate.split("/");
            const aParts2 = sEndDate.split("/");

            const oStart = new Date(aParts1[2], aParts1[1] - 1, aParts1[0]);
            const oEnd = new Date(aParts2[2], aParts2[1] - 1, aParts2[0]);

            const diffTime = oEnd - oStart;
            const iDays = Math.ceil(diffTime / (1000 * 3600 * 24));

            return iDays > 0 ? iDays : 0;
        },

        DateFormat: function (sDate) {
            if (sDate) {
                var oDateFormat = DateFormat.getDateInstance({
                    pattern: "dd/MM/yyyy"
                });
                return oDateFormat.format(new Date(sDate));
            }
            return sDate;
        },

        bytesToMB: function (bytes) {
            if (!bytes || isNaN(bytes)) {
                return "0 MB";
            }

            const mb = bytes / (1024 * 1024);
            return mb.toFixed(2) + " MB";
        },

        minDate: function (sStartDate) {
            if (!sStartDate) return null;
            const [d, m, y] = sStartDate.split("/");
            return new Date(`${y}-${m}-${d}`);
        },

        // formatCurrency: function(value, code) {
        //     if (value || value === 0) {
        //         var oCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
        //             currencyCode: false // hides the currency code like "INR"
        //         });
        //         var formatted = oCurrencyFormat.format(value);
        //         return code ? formatted + " " + code : formatted;
        //     }
        //     return "";
        // },

        formatPrice: function (price, currency) {
            if (!price || price === "" || price === 0) {
                return "";
            }

            var oCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
                currencyCode: true,
                minFractionDigits: 2,
                maxFractionDigits: 2
            });

            // Format value
            return oCurrencyFormat.format(Number(price), currency);
        },

        formatStartingPrice: function (currency, price) {

            if (!price || price === "" || price === 0) {
                return "";
            }

            var oCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
                currencyCode: true,
                minFractionDigits: 2,
                maxFractionDigits: 2
            });

            var formattedValue = oCurrencyFormat.format(Number(price), currency);
            return "Starting At " + formattedValue;
        },

        formatCurrency: function (value, code) {
            var n = parseFloat(value);
            var fmt = sap.ui.core.format.NumberFormat.getCurrencyInstance({ currencyCode: false });
            var formatted = fmt.format(n);
            return code ? formatted + " " + code : formatted;
        },

        getImageSrc: function (base64Str) {
            if (base64Str) {
                return "data:image/png;base64," + base64Str;
            }
            return ""; // fallback
        },

        fromatNumber: function (currencyOrValue, totalAmount, amountInINR) {
            var avalue;

            // If only one argument passed, treat it as value to format
            if (totalAmount === undefined && amountInINR === undefined) {
                avalue = currencyOrValue;
            } else {
                // Multiparameter call from multi-part binding
                avalue = currencyOrValue === "INR" ? totalAmount : amountInINR;
            }

            if (avalue === "0" || avalue === 0) {
                return "0.00";
            }
            var numericValue = parseFloat(avalue);
            if (isNaN(numericValue)) {
                return "";
            }

            var oFormatOptions = {
                groupingBaseSize: 3,
                groupingSize: 2,
                minIntegerDigits: 1,
                minFractionDigits: 2,
                maxFractionDigits: 4
            };

            var oFloatFormat = sap.ui.core.format.NumberFormat.getFloatInstance(oFormatOptions);
            return oFloatFormat.format(numericValue);
        },

        formatObjectStatus: function (sStatus) {
            switch (sStatus) {
                case "New":
                    return "Indication05";
                case "Renew":
                    return "Indication03";
                case "Active":
                    return "Success";
                case "Approved":
                    return "Success";
                case "Inactive":
                    return "Error";
                case "Rejected":
                    return "Error";
                case "Pending":
                    return "Error";
                case "In Progress":
                    return "Indication03";
                case "Resolved":
                    return "Indication04";
                case "Submitted":
                    return "Indication03";
                case "Company":
                    return "Indication13";
                case 'Employee':
                    return "Success";
                case 'Draft':
                    return "Indication17";
                case "Onboarded":
                    return "Success";
                case "Rejected":
                    return "Error";
                case "Offer Sent":
                    return "Indication06";
              case "Received":
                    return "Success";
                case "Invoiced":
                    return "Success";
                case "Payment Received":
                    return "Success";
                case "Invoice Sent":
                    return "Indication03";
                case "Send back by account":
                    return "Indication06";
                case "PDF Generated":
                    return "Indication18";
                case "Send back by manager":
                    return "Information";
                case "Paid":
                    return "Success";
                case "Available":
                    return "Success"
                case "Returned":
                    return "Success"
                case "Trashed":
                    return "Error"
                case "Assigned":
                    return "Indication03"
                case "Completed":
                    return "Success"
                case "Transferred":
                    return "Warning"
                case "Saved":
                    return "Indication03";
                case "Payment Partially":
                    return "Indication01";
                    case "Recovered":
                        return "Success"
                case "Pending":
                    return "Indication01"
                    case "In Progress":
                    return "Warning"
                    case "Resolved":
                    return "Success"
                default:
                    return "Indication01";

            }
        },

        formatDiscountValue: function (v, t) {
            return t === "Percentage" ? v + " %" : v;
        },

        formatStatusState: function (sStatus) {
            if (sStatus === "Active") {
                return "Success";   // Green
            }

            if (sStatus === "Expired") {
                return "Warning";   // Yellow / Orange
            }

            if (sStatus === "Inactive") {
                return "Error";     // Red
            }

            return "None";
        },

        formatCustomerTypeValue: function (sType, sValue) {
            if (sValue && sValue !== "") {
                return `${sType} (${sValue}%)`;
            }
            return sType;
        },
        formatShortFileType: function (mime) {
            if (!mime) return "";

            const map = {
                "application/pdf": "pdf",
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/jpg": "jpg",
                "image/gif": "gif",
                "application/msword": "doc",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
                "application/vnd.ms-excel": "xls",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
                "text/plain": "txt"
            };

            // Known type?
            if (map[mime]) return map[mime];

            // Fallback → take last part after slash:
            // e.g. "application/zip" → "zip"
            const parts = mime.split("/");
            return parts.length > 1 ? parts.pop() : mime;
        },
        formatFileSize: function (bytes) {
            if (!bytes || isNaN(bytes)) return "";

            if (bytes < 1024) return bytes + " B";
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";

            return (bytes / (1024 * 1024)).toFixed(2) + " MB";
        },
        fileTooltip: function (oData) {
            if (!oData) return "";

            const mime = oData.DocumentType;   // ✅ FIX
            const size = oData.size;

            let readable = "";
            if (size) {
                if (size < 1024) readable = size + " B";
                else if (size < 1024 * 1024) readable = (size / 1024).toFixed(1) + " KB";
                else readable = (size / (1024 * 1024)).toFixed(2) + " MB";
            }

            return `Type: ${mime}\nSize: ${readable}`;
        },
        VRD_formatFacilityPrice: function (price, currency, unitText) {
            if (!price || price === 0 || price === "0") {
                return "";
            }

            var oFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
                currencyCode: false,
                minFractionDigits: 2,
                maxFractionDigits: 2
            });

            var formattedPrice = oFormat.format(Number(price));

            var result = formattedPrice;
            if (currency) {
                result += " " + currency;
            }
            if (unitText) {
                result += " / " + unitText;
            }

            return result;
        },
        formatFacilityPrice: function (price, currency, unitText, totalTime) {
            if (!price || !currency || !unitText) {
                return "";
            }

            // Default hour = 1 if not provided
            if (unitText === "Per Hour") {
                const hours = totalTime && Number(totalTime) > 0 ? totalTime : 1;
                return `${price} ${currency} (${hours} Hour)`;
            }

            // Other units
            return `${price} ${currency} ${unitText}`;
        },
         formatPerDayText: function (sPriceType, iDays) {
    if (sPriceType === "Per Day") {
        return iDays ? iDays + " Days" : "";
    }
    return "";
},

formatPerMonthYearText: function (sPriceType, iMonths) {

    if (sPriceType === "Per Month") {
        return iMonths + (iMonths > 1 ? " Months" : " Month");
    }

    if (sPriceType === "Per Year") {
        return iMonths + (iMonths > 1 ? " Years" : " Year");
    }

    return "";
},
formatDurationText: function (sPriceType, iMonths, iDays) {

    if (sPriceType === "Per Day") {
        return iDays ? iDays + " Days" : "";
    }

    if (sPriceType === "Per Month") {
        return iMonths ? iMonths + (iMonths > 1 ? " Months" : " Month") : "";
    }

    if (sPriceType === "Per Year") {
        return iMonths ? iMonths + (iMonths > 1 ? " Years" : " Year") : "";
    }

    return "";
},

        formatMonthlyPaymentText: function (iSelectedPerson, sSelectedPriceType) {

            // Guard: missing values
            if (!sSelectedPriceType) {
                return "";
            }

            // Multiple persons
            if (iSelectedPerson > 1) {
                if (sSelectedPriceType === "Per Month") {
                    return "You need to pay monthly for each person";
                }
                if (sSelectedPriceType === "Per Year") {
                    return "You need to pay yearly for each person";
                }
            }

            // Single or less than one person
            if (iSelectedPerson <= 1) {
                if (sSelectedPriceType === "Per Month") {
                    return "You need to pay every month";
                }
                if (sSelectedPriceType === "Per Year") {
                    return "You need to pay every year";
                }

            }
            return "";
        },

        displayFormatDate: function (sDate) {
            if (!sDate) {
                return "";
            }

            const oDate = new Date(sDate);

            // Handle invalid / default backend dates like 1899-11-30
            if (
                isNaN(oDate.getTime()) ||
                oDate.getFullYear() <= 1900
            ) {
                return "";
            }

            const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "dd/MM/yyyy"
            });

            return oDateFormat.format(oDate);
        },
    getDurationValue: function (sType, iTotalDays, iSelectedMonths) {

    if (!sType) {
        return "";
    }

    if (sType === "Per Day") {
        return iTotalDays || 0;
    }

    if (sType === "Per Month" || sType === "Per Year") {
        return iSelectedMonths || 0;
    }

    return "";
}
,
formatCGSTLabel: function (sGSTValue) {

    const gst = Number(sGSTValue) || 0;
    const cgst = gst;

    return `CGST (${cgst}%):`;
},
formatSGSTLabel: function (sGSTValue) {

    const gst = Number(sGSTValue) || 0;
    const sgst = gst;

    return `SGST (${sgst}%):`;
},
formatIGSTLabel: function (sGSTValue) {

    const gst = Number(sGSTValue) || 0;
    const igst = gst;

    return `IGST (${igst}%):`;
},
 joinWithSlash: function (mode, txnId) {
            if (!mode && !txnId) return "";
            if (!mode) return txnId;
            if (!txnId) return mode;
            return mode + " / " + txnId;
        },




        
    }
});
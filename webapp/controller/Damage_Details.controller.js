sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "../model/formatter",
], function (
    BaseController,
    JSONModel,
    utils,
    Formatter
) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Damage_Details", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteDamageDetails").attachMatched(this._onRouteMatched, this);
        },
        
        _onRouteMatched: async function (oEvent) {
            try {
                this.getBusyDialog();

                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                var sDamageID = decodeURIComponent(oEvent.getParameter("arguments").sPath);

                this._ViewDatePickersReadOnly(["HD_id_DamageDate1"], this.getView());

                this.decodedPath = sDamageID;

                var oDamageModel = new JSONModel({
                    CustomerID: "",
                    CustomerName: "",
                    RoomNo: "",
                    BedTypeName: "",
                    BranchCode: "",
                    ItemName: "",
                    Description: "",
                    Cost: "",
                    Date: Formatter.formatDate(new Date()),
                    Status: "Damage Raised",
                    DamageID: "",
                    Currency: "",
                    CustomerEmail: "",
                    Type: "",
                    UserID: "",
                    DueAmount: "",
                    Items: []
                });

                this.getView().setModel(oDamageModel, "DamageModel");

                var loginModel = this.getOwnerComponent().getModel("LoginModel");

                var oVisibleModel = new JSONModel({
                    visible: false
                });

                this.getView().setModel(oVisibleModel, "VisibleModel");

                this.BranchCode = loginModel.getProperty("/BranchCode");

                await this.readCustomerData();
                await this.OnSearch();

            } catch (err) {
                MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog();
            }
        },


        OnSearch: async function () {
            try {

                const filter = {
                    DamageID: this.decodedPath
                };

                if (this.decodedPath !== "Damage") {

                    const oData = await this.ajaxReadWithJQuery("HM_DamageItem", filter);

                    var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];

                    var Damage = oFCIAerData[0].HM_Damage[0];
                    var Items = oFCIAerData[0].HM_DamageItem;

                    var aItemsWithIndex = Items.map(function (item, index) {
                        return {
                            IndexNo: index + 1,
                            Type: item.Type,
                            ItemName: item.ItemName,
                            Description: item.Description,
                            Cost: item.Cost,
                            Quantity: item.Quantity,
                            ItemId: item.ItemID
                        };
                    });

                    var DamageModel = {
                        DamageID: Damage.DamageID,
                        CustomerID: Damage.CustomerID,
                        CustomerName: Damage.CustomerName,
                        RoomNo: Damage.RoomNo,
                        BedTypeName: Damage.BedTypeName,
                        BranchCode: Damage.BranchCode,
                        Date: Formatter.formatDate(new Date(Damage.InvoiceDate)),
                        Status: Damage.Status,
                        Currency: Damage.Currency,
                        CustomerEmail: Damage.CustomerEmail,
                        UserID: Damage.UserID,
                        TotalCost: Damage.TotalCost,
                        ReturnDamageAmount: Damage.ReturnDamageAmount,
                        Items: aItemsWithIndex
                    };

                    this.getView().setModel(new JSONModel(DamageModel), "DamageModel");

                    if (Damage.Status === "Partially Recovered") {

                        var dueAmount =
                            parseFloat(DamageModel.TotalCost) -
                            parseFloat(DamageModel.ReturnDamageAmount || 0);

                        this.getView().getModel("DamageModel").setProperty("/DueAmount", dueAmount.toString());

                        this.getView().getModel("DamageModel").setProperty(
                            "/ReturnDamageAmount",
                            DamageModel.ReturnDamageAmount.toString()
                        );
                    }
                }

                if (this.decodedPath === "Damage") {

                    this.getView().getModel("VisibleModel").setProperty("/visible", true);
                    this.getView().byId("HD_id_CustomerID1").setEditable(true);

                } else if (
                    this.getView().getModel("DamageModel").getProperty("/Status") === "Damage Claimed"
                ) {

                    this.getView().byId("idEditButton").setVisible(false);
                    this.getView().byId("HD_id_CustomerID1").setEditable(false);
                    this.getView().byId("HD_id_DamageDate1").setEditable(false);

                } else {

                    this.getView().getModel("VisibleModel").setProperty("/visible", false);
                    this.getView().byId("HD_id_CustomerID1").setEditable(false);
                }

            } catch (err) {
                MessageToast.show(err.message || err.responseText);
            }
        },

        DM_onPressEdit: function () {
            this.getView().getModel("VisibleModel").setProperty("/visible", true);
            if (this.decodedPath === "Damage") {
                this.getView().byId("HD_id_CustomerID1").setEditable(true);

            } else {
                this.getView().byId("HD_id_CustomerID1").setEditable(false);

            }
        },
        DM_onPressDelete: async function () {

            var oTable = this.byId("CID_id_TableInvoiceItem1");
            var oModel = this.getView().getModel("DamageModel");
            var aItems = oModel.getProperty("/Items") || [];
            var aSelectedItems = oTable.getSelectedItems();
            var that = this;

            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show("Please select at least one item");
                return;
            }

            var aIndexes = aSelectedItems.map(function (oItem) {
                var sPath = oItem.getBindingContext("DamageModel").getPath();
                return parseInt(sPath.split("/")[2]);
            });

            var hasSavedItem = aSelectedItems.some(function (oItem) {
                return !!oItem.getBindingContext("DamageModel").getObject().ItemId;
            });

            var fnDelete = async function () {

                // that.getBusyDialog()
                sap.ui.core.BusyIndicator.show(0);

                try {

                    for (let oItem of aSelectedItems) {
                        let oData = oItem.getBindingContext("DamageModel").getObject();

                        if (oData.ItemId) {
                            await that.ajaxDeleteWithJQuery("HM_DamageItem", {
                                filters: { ItemID: oData.ItemId }
                            });
                        }
                    }

                    aIndexes.sort(function (a, b) {
                        return b - a;
                    });

                    aIndexes.forEach(function (index) {
                        aItems.splice(index, 1);
                    });

                    aItems.forEach(function (item, i) {
                        item.IndexNo = i + 1;
                    });

                    var totalCost = aItems.reduce(function (sum, item) {
                        return sum + (parseFloat(item.Cost) || 0);
                    }, 0);

                    oModel.setProperty("/Items", aItems);
                    oModel.setProperty("/TotalCost", totalCost.toFixed(2));
                    var dueAmount = parseFloat(oModel.getProperty("/TotalCost")) - parseFloat(oModel.getProperty("/ReturnDamageAmount") || 0);
                    oModel.setProperty("/DueAmount", dueAmount.toFixed(2));

                    oTable.removeSelections();

                    sap.m.MessageToast.show("Selected Item(s) Deleted");
                    

                } catch (err) {
                    that.closeBusyDialog()
                    console.error(err);
                    sap.m.MessageToast.show("Error while deleting");
                }

                // that.closeBusyDialog()
                sap.ui.core.BusyIndicator.hide();

            };

            if (hasSavedItem) {

                sap.m.MessageBox.confirm(
                    "Are you sure you want to delete selected item(s)?",
                    {
                        title: "Confirm Deletion",
                        onClose: function (sAction) {
                            if (sAction === "OK") {
                                fnDelete();
                            }
                        }
                    }
                );
                
            } else {
                fnDelete();
            }

        },
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteDamage");
        },

        onHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
        DM_onPressAddDamageItems: function () {
            var oModel = this.getView().getModel("DamageModel");
            var aItems = oModel.getProperty("/Items");

            aItems.push({
                IndexNo: aItems.length + 1,
                Type: "",
                ItemName: "",
                Description: "",
                Cost: "",
                Total: ""
            });

            oModel.setProperty("/Items", aItems);
            var table = this.byId("CID_id_TableInvoiceItem1");
            table.removeSelections();
        },
         onTotalInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oEvent.getParameter("value");

            // Allow only numbers and decimal
            sValue = sValue.replace(/[^0-9.]/g, "");

            oInput.setValue(sValue);

            var oContext = oInput.getBindingContext("DamageModel");
            var oModel = this.getView().getModel("DamageModel");

            oModel.setProperty(oContext.getPath() + "/Cost", sValue);

            var aItems = oModel.getProperty("/Items") || [];
            var totalCost = 0;

            aItems.forEach(function (item) {
                totalCost += parseFloat(item.Cost) || 0;
            });

            oModel.setProperty("/TotalCost", totalCost.toFixed(2));
            var dueAmount = parseFloat(oModel.getProperty("/TotalCost")) - parseFloat(oModel.getProperty("/ReturnDamageAmount") || 0);
            oModel.setProperty("/DueAmount", dueAmount.toFixed(2));

        },
        onQuantityInputLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oEvent.getParameter("value");

            // Allow only numbers and decimal
            sValue = sValue.replace(/[^0-9.]/g, "");

            oInput.setValue(sValue);
        },

        DM_onPressSubmit: function () {

            var oModel = this.getView().getModel("DamageModel");
            var oData = oModel.getData();

            if (this.decodedPath === "Damage") {
                if (
                    !utils._LCstrictValidationComboBox(this.getView().byId("HD_id_CustomerID1"), "ID") ||
                    !utils._LCvalidateMandatoryField(this.getView().byId("HD_id_DamageDate1"), "ID")
                ) {
                    sap.m.MessageToast.show(
                        this.i18nModel.getText(
                            "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
                        )
                    );
                    return;
                }
            }
            if (oData.Items.length === 0) {
                sap.m.MessageBox.error("Please add at least one damage item");
                return;
            }
            var aItems = oData.Items || [];

            for (var i = 0; i < aItems.length; i++) {
                var item = aItems[i];
                var aMissingFields = [];

                if (!item.ItemName) {
                    aMissingFields.push("Item Name");
                }

                if (!item.Type) {
                    aMissingFields.push("Type");
                }

                if (item.Quantity === "" || item.Quantity === null || item.Quantity === undefined) {
                    aMissingFields.push("Quantity");
                }

                if (item.Cost === "" || item.Cost === null || item.Cost === undefined) {
                    aMissingFields.push("Cost");
                }

                // If any field missing → show one message and stop
                if (aMissingFields.length > 0) {
                    sap.m.MessageBox.error(
                        "Row " + (i + 1) + " : Please fill required field(s): " +
                        aMissingFields.join(", ")
                    );
                    return;
                }
            }


            var Payload = {
                data: {
                    CustomerID: oData.CustomerID,
                    UserID: oData.UserID,
                    CustomerName: oData.CustomerName,
                    CustomerEmail: oData.CustomerEmail,
                    InvoiceDate: oData.Date.split('/').reverse().join('-'),
                    RoomNo: oData.RoomNo,
                    Currency: oData.Currency,
                    Status: "Damage Raised",
                    BedTypeName: oData.BedTypeName,
                    TotalCost: oData.TotalCost,
                    BranchCode: oData.BranchCode
                },
                Items: oData.Items.map(item => {
                    return {
                        Type: item.Type,
                        ItemName: item.ItemName,
                        Description: item.Description,
                        Cost: item.Cost,
                        Quantity: item.Quantity
                    };
                })
            };

            this.getBusyDialog()

            if (oData.DamageID) {

                var aItems = oData.Items.map(item => {

                    var itemObj = {
                        data: {
                            DamageID: oData.DamageID,
                            Type: item.Type,
                            ItemName: item.ItemName,
                            Description: item.Description,
                            Cost: item.Cost,
                            Quantity: item.Quantity,
                        }

                    };

                    if (!item.ItemId) {
                        itemObj.filters = {
                            flag: "create"
                        };
                    } else {
                        itemObj.filters = {
                            ItemID: item.ItemId
                        }
                    }


                    return itemObj;
                });


                var Payload = {
                    data: Payload.data,
                    filters: {
                        DamageID: oData.DamageID
                    },
                    Items: aItems,

                };

                this.ajaxUpdateWithJQuery("HM_Damage", Payload)
                    .then(() => {
                        this.closeBusyDialog()
                        sap.m.MessageToast.show("Damage Updated Successfully");
                        this.OnSearch();
                        this.getView().getModel("VisibleModel")
                            .setProperty("/visible", false);
                    })
                    .catch(err => {
                        this.closeBusyDialog()
                        sap.m.MessageToast.show("Error while updating");
                        console.error(err);
                    });

            } else {

                this.ajaxCreateWithJQuery("HM_Damage", Payload)
                    .then((Data) => {
                        this.decodedPath = Data.InvoiceNo;
                        this.closeBusyDialog()
                        this.OnSearch();
                        this.getView().getModel("VisibleModel")
                            .setProperty("/visible", false);
                        this.getView().byId("HD_id_CustomerID1").setEditable(false);
                        sap.m.MessageBox.confirm(
                            "Damage Created Successfully",
                            {
                                title: "Confirmation",
                                actions: [
                                    sap.m.MessageBox.Action.OK,
                                    "GeneratePDF"
                                ],
                                // emphasizedAction: sap.m.MessageBox.Action.OK,
                                onClose: async (oAction) => {
                                    if (oAction === sap.m.MessageBox.Action.OK) {
                                        this.getOwnerComponent()
                                            .getRouter()
                                            .navTo("RouteDamage");
                                    } else {
                                        this.DM_onPressGeneratePDF();
                                    }
                                }
                            }
                        );


                    })
                    .catch(err => {
                        this.closeBusyDialog()
                        sap.m.MessageToast.show("Error while saving");
                        console.error(err);
                    });
            }
        },

        readCustomerData: async function () {

            try {

                var filter = {
                    BranchCode: this.BranchCode
                };

                const oData = await this.ajaxReadWithJQuery(
                    "HM_BookingCustomerReadCall",
                    filter
                );

                var aData = Array.isArray(oData.commentData)
                    ? oData.commentData
                    : [oData.commentData];

                const aFilteredData = aData.filter(
                    item => item.Status === "Assigned" || item.Status === "Completed"
                );

                this.getView().setModel(
                    new sap.ui.model.json.JSONModel(aFilteredData),
                    "CustomerModel"
                );

            } catch (err) {
                MessageToast.show(err.message || err.responseText);
            }
        },

        onChangeAddCustomer: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
            this.SelectKey = oEvent.getSource().getSelectedKey();
            const allData = this.getView().getModel("CustomerModel").getData();

            const SelectedData = allData.find(item => item.CustomerID === this.SelectKey);
            if (!SelectedData) return;

            var oDamageModel = this.getView().getModel("DamageModel");
            oDamageModel.setProperty("/CustomerID", SelectedData.CustomerID);
            oDamageModel.setProperty("/CustomerName", SelectedData.CustomerName);
            oDamageModel.setProperty("/RoomNo", SelectedData.RoomNo);
            oDamageModel.setProperty("/BedTypeName", SelectedData.BedType);
            oDamageModel.setProperty("/BranchCode", SelectedData.BranchCode);
            oDamageModel.setProperty("/CustomerEmail", SelectedData.CustomerEmail);
            oDamageModel.setProperty("/Currency", SelectedData.Currency);
            oDamageModel.setProperty("/UserID", SelectedData.UserID)
        },

        DM_onPressGeneratePDF: async function () {
            try {
                this.getBusyDialog()
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF("portrait", "mm", "a4");

                const oModel = this.getView().getModel("DamageModel").getData();
                const aItems = oModel.Items || [];

                let filter = {
                    BranchID: [oModel.BranchCode]
                };

                const oCompanyDetailsModel = await this.ajaxReadWithJQuery("HM_Branch", filter);
                var companyImage = oCompanyDetailsModel?.data[0].Photo1 || "";

                const margin = 15;
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                let currentY = 20;


                doc.setFont("times", "bold");
                doc.setFontSize(16);

                if (oModel.Status === "Damage Claimed") {
                    doc.text("DAMAGE RECEIPT", pageWidth - margin, currentY, { align: "right" });
                } else {
                    doc.text("DAMAGE NOTICE", pageWidth - margin, currentY, { align: "right" });
                }

                currentY += 15;

                if (companyImage && companyImage.trim() !== "") {
                    const imgData = "data:image/png;base64," + companyImage;
                    doc.addImage(imgData, "PNG", margin, 15, 40, 40);
                }


                // ================= DAMAGE META (RIGHT SIDE TABLE STYLE) =================
                const detailsStartY = currentY;
                const rowHeight = 7;
                const columnWidths = [45, 35]; // label width + value width

                // Right side alignment calculation
                const rightAlignX = pageWidth - margin - columnWidths[0] - columnWidths[1];

                doc.setFontSize(11);
                doc.setFont("times", "bold");

                const damageDetails = [
                    {
                        label: "Damage No :",
                        value: oModel.DamageID || "N/A"
                    },
                    {
                        label: "Date :",
                        value: oModel.Date || "N/A"
                    },
                    {
                        label: "Room No :",
                        value: oModel.RoomNo || "N/A"
                    }                   
                ];

                // Print right-aligned structured block
                currentY = detailsStartY;

                damageDetails.forEach(row => {

                    // Label (right aligned inside first column)
                    doc.text(
                        row.label,
                        rightAlignX + columnWidths[0] - doc.getTextWidth(row.label),
                        currentY + 5
                    );

                    // Value (left aligned inside second column)
                    doc.setFont("times", "normal");
                    doc.text(
                        String(row.value),
                        rightAlignX + columnWidths[0] + 5,
                        currentY + 5
                    );

                    // Reset bold for next label
                    doc.setFont("times", "bold");

                    currentY += rowHeight;
                });

                currentY += 8; // spacing after block

                doc.setFont("times", "bold").setFontSize(11);
                doc.text("To,", margin, currentY);
                currentY += 6;

                doc.setFont("times", "normal").setFontSize(12);
                doc.text(`Name : ${oModel.CustomerName}`, margin, currentY);
                currentY += 6;

                // doc.text(`Customer ID : ${oModel.CustomerID}`, margin, currentY);
                // currentY += 6;

                doc.text(`Email : ${oModel.CustomerEmail}`, margin, currentY);
                currentY += 10;


                const body = aItems.map((item, index) => [
                    index + 1,
                    item.ItemName,
                    item.Description || "-",
                    item.Type,
                    item.Quantity,
                    item.Cost
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: [['Sl.No', 'Item Name', 'Description', 'Type', 'Quantity', 'Cost']],
                    body: body,
                    theme: "grid",
                    headStyles: {
                        fillColor: [20, 170, 183]
                    },
                    styles: {
                        font: "times",
                        fontSize: 10,
                        cellPadding: 3,
                        lineWidth: 0.5,
                        lineColor: [30, 30, 30],
                        halign: "center"
                   },
                            columnStyles: {
                                1: {
                                    halign: "left"
                                },
                                2: {
                                    halign: "left"
                                },
                                3: {
                                    halign: "center"
                                },
                                4: {
                                    halign: "center"
                                },
                                5: {
                                    halign: "right"
                                }
                            }
                        });

                currentY = doc.lastAutoTable.finalY + 8;
                
                // ================= SUMMARY =================
                const totalAmount = parseFloat(oModel.TotalCost || 0);
                const summary = [];

                if (totalAmount > 0) {
                    summary.push([
                        `Sub-Total (${oModel.Currency}) :`,
                        totalAmount.toFixed(2)
                    ]);
                }

                const totalRowIndex = summary.length;

                summary.push([
                    `Total (${oModel.Currency}) :`,
                    totalAmount.toFixed(2)
                ]);

                doc.autoTable({
                    startY: currentY,
                    body: summary,
                    theme: "plain",
                    styles: {
                        font: "times",
                        fontSize: 10,
                        halign: "right",
                        cellPadding: 2,
                        overflow: "ellipsize"
                    },
                    columnStyles: {
                        0: {
                            halign: "right",
                            cellWidth: 60
                        },
                        1: {
                            halign: "right",
                            cellWidth: 40
                        }
                    },
                    margin: {
                        left: 95
                    },
                    didParseCell: function (data) {
                        if (data.row.index === totalRowIndex) {
                            data.cell.styles.lineWidth = {
                                top: 0.5,
                                right: 0,
                                bottom: 0,
                                left: 0
                            };

                            data.cell.styles.lineColor = [0, 0, 0];
                            data.cell.styles.fontStyle = "bold";
                        }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 8;   
                const finalAmount = oModel.Status === "Damage Raised" ? totalAmount : totalAmount;
                const amountInWords = await this.convertNumberToWords(finalAmount, "INR");

                doc.setFont("times", "bold");
                doc.text("Amount in Words :", margin, currentY);
                currentY += 6;

                doc.setFont("times", "normal");
                const lines = doc.splitTextToSize(amountInWords, pageWidth - 2 * margin);
                doc.text(lines, margin, currentY);

                this.addFooter(doc, oCompanyDetailsModel, pageWidth, pageHeight);


                doc.save(`${oModel.CustomerName}-${oModel.DamageID}-Damage.pdf`);

            } catch (error) {
                sap.m.MessageToast.show(error.message);
            } finally {
                this.closeBusyDialog()
            }
        },

        addFooter: function (doc, oCompanyDetailsModel, pageWidth, pageHeight) {
            const footerHeight = 18;
            const footerYPosition = pageHeight - footerHeight;
            const footerWidth = pageWidth;

            const company = oCompanyDetailsModel.data[0];

            // Grey footer background
            doc.setFillColor(128, 128, 128);
            doc.rect(0, footerYPosition, footerWidth, footerHeight, 'F');

            doc.setFont("helvetica", "normal");
            doc.setTextColor(255, 255, 255); // White text

            const textYPosition = footerYPosition + 5;
            const lineHeight = 5;
            let currentYPosition = textYPosition;

            // Jurisdiction line
            if (company && company.City) {
                doc.setFontSize(8);
                doc.text(`SUBJECT TO ${company.City.toUpperCase()} JURISDICTION`, footerWidth / 2, currentYPosition, {
                    align: 'center'
                });
                currentYPosition += lineHeight;
            }

            // GSTIN
            if (company && company.GSTIN) {
                doc.setFontSize(10);
                doc.text(`GSTIN : ${company.GSTIN}`, footerWidth - 5, currentYPosition, {
                    align: 'right'
                });
            }

            if (company && company.Address) {
                doc.setFontSize(10);

                // Combine address + mobile at the end
                let fullAddress = company.Address;
                if (company.Contact) {
                    fullAddress += `, Mobile No : ${company.STD}-${company.Contact}`;
                }

                // Wrap text to fit footer width
                const addressLines = doc.splitTextToSize(fullAddress, footerWidth - 100);
                let currentYPosition = textYPosition + 5;

                // Render each line
                addressLines.forEach((line) => {
                    doc.text(line, 5, currentYPosition);
                    currentYPosition += lineHeight;
                });
            }
        },
    });
});
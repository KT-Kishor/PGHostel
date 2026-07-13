sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation",
    "sap/ui/export/Spreadsheet",
    "sap/suite/ui/commons/Timeline",
    "sap/suite/ui/commons/TimelineItem"

], function (BaseController, Formatter, JSONModel, MessageToast, utils, Spreadsheet,Timeline,TimelineItem) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.RaiseBug", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteBugDetails").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function (oEvent) {
            this.getBusyDialog();
            var LoginFUnction = await this.commonLoginFunction("ManageVendor");
            if (!LoginFUnction) return;
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().byId("RB_id_RaisedBy1").setSelectedKey("")
            this.getView().byId("RB_id_Status").setSelectedKey("")
            this.CD_read()
            this._loadAllFilterData()
        },

        SP_onPressClear: function () {
            this.getView().byId("RB_id_RaisedBy1").setSelectedKey("")
            this.getView().byId("RB_id_Status").setSelectedKey("")
        },

        CD_read: async function () {
            const SRaisedBy = this.byId("RB_id_RaisedBy1").getSelectedKey() || this.byId("RB_id_RaisedBy1").getValue();
            const SStatus = this.byId("RB_id_Status").getSelectedKey() || this.byId("RB_id_Status").getValue();

            let filters = {};

            if (SRaisedBy) filters.RaisedBy = SRaisedBy;
            if (SStatus) filters.Status = SStatus;

            this.getBusyDialog();
            await this.ajaxReadWithJQuery("HM_Bug", filters).then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];

                // ✅ Set table data (filtered)
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "RaiseBugModel");
            });
            this.closeBusyDialog();
        },

        _loadAllFilterData: async function () {
            await this.ajaxReadWithJQuery("HM_Bug", {}).then((oData) => {
                var aFullData = Array.isArray(oData.data) ? oData.data : [oData.data];

                // ✅ Store full dataset
                this._allData = aFullData;
                // ✅ Populate dropdown from full data
                this._populateUniqueFilterValues(this._allData);
            });
        },

        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                RB_id_RaisedBy1: new Set(),
                RB_id_Status: new Set()
            };

            data.forEach(item => {
                if (item.RaisedBy && item.RaisedBy.trim()) {
                    uniqueValues.RB_id_RaisedBy1.add(item.RaisedBy.trim());
                }
                if (item.Status && item.Status.trim()) {
                    uniqueValues.RB_id_Status.add(item.Status.trim());
                }
            });

            let oView = this.getView();

            ["RB_id_RaisedBy1", "RB_id_Status"].forEach(field => {
                let oComboBox = oView.byId(field);
                if (!oComboBox) return;

                // ✅ Preserve selected value before reset
                let sSelectedKey = oComboBox.getSelectedKey();
                oComboBox.destroyItems();

                Array.from(uniqueValues[field])
                    .sort()
                    .forEach(value => {
                        oComboBox.addItem(new sap.ui.core.Item({
                            key: value,
                            text: value
                        }));
                    });
                // ✅ Restore selection if still valid
                if (sSelectedKey && uniqueValues[field].has(sSelectedKey)) {
                    oComboBox.setSelectedKey(sSelectedKey);
                } else {
                    oComboBox.setSelectedKey("");
                }
            });
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        onHome: function () {
            this.CommonLogoutFunction();
        },

        RB_resolve: function () {
            var table = this.byId("idBugTable");
            var selected = table.getSelectedItem();

            if (!selected) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectRecordtoresolve"));
                return;
            }
            var oContext = selected.getBindingContext("RaiseBugModel");
            var Data = oContext.getObject();

            if (Data.Status === "Resolved") {
                sap.m.MessageToast.show(this.i18nModel.getText("alreadyResolved"));
                return;
            }
            if (!this.SP_Dialog) {
                this.SP_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Bug", this);
                this.getView().addDependent(this.SP_Dialog);
            }
            this.SP_Dialog.open();

            // Get Fragment Controls
            var oDesc = sap.ui.getCore().byId("RB_id_Description");
            var oDate = sap.ui.getCore().byId("RB_id_ResolutionDate");

            if (oDesc) {
                oDesc.setValue("");
                oDesc.setValueState("None");
            }
            if (oDate) {
                // Set today's date correctly
                oDate.setDateValue(new Date());
                oDate.setValueState("None");
            }
            this._FragmentDatePickersReadOnly(["RB_id_ResolutionDate"]);
        },

        supportCancel: function () {
            this.byId("idBugTable").removeSelections();
            this.SP_Dialog.close();
        },

        onDescInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },

        BugResolveSave: function () {
            var oDesc = sap.ui.getCore().byId("RB_id_Description");
            var oDatePicker = sap.ui.getCore().byId("RB_id_ResolutionDate");

            if (
                utils._LCvalidateMandatoryField(oDesc, "ID") &&
                utils._LCvalidateMandatoryField(oDatePicker, "ID")
            ) {
                var table = this.byId("idBugTable");
                var selected = table.getSelectedItem();

                if (!selected) {
                    sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectRecordtoresolve"));
                    return;
                }
                var oContext = selected.getBindingContext("RaiseBugModel");
                var SPData = oContext.getObject();
                // Get Date properly
                var oDate = oDatePicker.getDateValue();

                if (!oDate) {
                    sap.m.MessageToast.show("Please select a valid resolution date");
                    return;
                }
                // Format Date
                var sResolvedDate = oDate.toISOString();

                var Payload = {
                    "BugID": SPData.BugID,
                    "AppName": SPData.AppName,
                    "BugDescription": SPData.BugDescription,
                    "RaisedBy": SPData.RaisedBy,
                    "Email": SPData.Email,
                    "ResolvedDescription": oDesc.getValue(),
                    "Status": "Resolved",
                    "ResolvedDate": sResolvedDate
                };
                this.getBusyDialog();

                this.ajaxUpdateWithJQuery("HM_Bug", {
                    data: Payload,
                    filters: {
                        BugID: SPData.BugID
                    }
                })
                    .then(async (oData) => {
                        await this.CD_read();
                        this.SP_Dialog.close();
                    })
                    .catch((oError) => {
                        MessageToast.show("Error while updating Bug request");
                    })
                    .finally(() => {
                        this.closeBusyDialog();
                        MessageToast.show("Bug Resolved Successfully");

                    });
            } else {
                MessageToast.show(this.i18nModel.getText("MSfillallfields"));
            }
        },

        HF_viewroom: async function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("RaiseBugModel");
            var oRowData = oContext.getObject();
            var filter = {
                BugID: oRowData.BugID
            };
            this.getBusyDialog();

            this.ajaxReadWithJQuery("HM_Bugdata", filter).then((oData) => {
                this.closeBusyDialog();
                if (!oData.data || oData.data.length === 0) {
                    sap.m.MessageBox.information("No data found");
                    return;
                }
                const record = oData.data[0];
                let aImages = [];

                if (record.Photo1) {
                    aImages.push({
                        src: record.Photo1,
                        type: record.Photo1Type
                    });
                }
                if (record.Photo2) {
                    aImages.push({
                        src: record.Photo2,
                        type: record.Photo2Type
                    });
                }
                if (record.Photo3) {
                    aImages.push({
                        src: record.Photo3,
                        type: record.Photo3Type
                    });
                }
                if (aImages.length === 0) {
                    sap.m.MessageBox.information("No images uploaded.");
                    return;
                }

                const aCarouselImages = aImages.map(function (img) {
                    let base64 = img.src.replace(/\s/g, "");
                    if (!base64.startsWith("data:image")) {
                        base64 = "data:" + img.type + ";base64," + base64;
                    }
                    return new sap.m.FlexBox({
                        width: "100%",
                        height: "100%",
                        alignItems: "Center",
                        justifyContent: "Center",
                        renderType: "Bare",
                        items: [
                            new sap.m.Image({
                                src: base64,
                                densityAware: false,
                                decorative: false,
                            }).addStyleClass("supportCarouselImage")
                        ]
                    }).addStyleClass("supportCarouselImagePage");
                });

                this._openImageDialog(aCarouselImages);
            })
                .catch((err) => {
                    this.closeBusyDialog();
                    sap.m.MessageBox.error("Failed to load images");
                });
        },

        _openImageDialog: function (aImages) {
            const oCarousel = new sap.m.Carousel({
                pages: aImages,
                width: "100%",
                height: "100%",
                showPageIndicator: false
            }).addStyleClass("supportImageCarousel");

            this._oDialog = new sap.m.Dialog({
                title: "Support Images",
                contentWidth: "80vw",
                contentHeight: "80vh",
                resizable: true,
                draggable: true,
                verticalScrolling: false,
                horizontalScrolling: false,
                contentPadding: "0rem",
                content: [oCarousel],
                endButton: new sap.m.Button({
                    text: "Close",
                    press: () => {
                        this._oDialog.close();
                    }
                }).addStyleClass("myUnifiedBtn"),
                afterClose: () => {
                    this._oDialog.destroy();
                    this._oDialog = null;
                }
            }).addStyleClass("supportImageDialog");
            this._oDialog.open();
        },

        createTableSheet: function () {
            return [
            {
                label: "Bug ID",
                property: "BugID",
                type: "string"
            },
            {
                label: "App Name",
                property: "AppName",
                type: "string"
            },
            {
                label: "Bug Description",
                property: "BugDescription",
                type: "string"
            },
            {
                label: "Raised By",
                property: "RaisedBy",
                type: "string"
            },
            {
                label: "Email",
                property: "Email",
                type: "string"
            },
            {
                label: "Created Date",
                property: "CreatedDate",
                type: "string"
            },
            {
                label: "Resolved Date",
                property: "ResolvedDate",
                type: "string"
            },
            {
                label: "Status",
                property: "Status",
                type: "string"
            },
            {
                label: "Comments",
                property: "Comment",
                type: "string"
            },
            ]
        },

        RB_onDownload: function () {
            const oModel = this.byId("idBugTable").getModel("RaiseBugModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => {
                let resolvedDate = "";
                let createdDate = "";

                if (item.ResolvedDate && item.ResolvedDate !== "null" && item.ResolvedDate !== "1899-11-30") {
                    const d = new Date(item.ResolvedDate);
                    if (d.getFullYear() > 1900) {
                        resolvedDate = Formatter.formatDate(item.ResolvedDate);
                    }
                }
                if (item.CreatedDate) {
                    const d2 = new Date(item.CreatedDate);
                    if (d2.getFullYear() > 1900) {
                        createdDate = Formatter.formatDate(item.CreatedDate);
                    }
                }
                return {
                    ...item,
                    ResolvedDate: resolvedDate,
                    CreatedDate: createdDate
                };
            });
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level",
                    context: {
                        sheetName: "Bug Details"
                    }
                },
                dataSource: adjustedData,
                fileName: "Bug_Details.xlsx",
                worker: false
            };
            MessageToast.show(this.i18nModel.getText("downloadingBug"));
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).finally(() => {
                oSheet.destroy();
            });
        },
        RB_edit:function(oEvent){
            var oView = this.getView();

             var table = this.byId("idBugTable");
            var selected = table.getSelectedItem();

            if (!selected) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectRecordtoedit"));
                return;
            }
            var oContext = selected.getBindingContext("RaiseBugModel");
            var Data = oContext.getObject();

            if(Data.Status==="Resolved"){
                   sap.m.MessageToast.show(this.i18nModel.getText("resolvedBugCannotBeModified"));
                return;
            }


                //   if(Data.Status==="Resolved")
              if (!this.ED_Dialog) {
                this.ED_Dialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.RaiseBug",
                    this
                );
                oView.addDependent(this.ED_Dialog);
            }
                this.ED_Dialog.open();
                this.byId("RB_id_appname").setValue(Data.AppName).setEditable(false);
                this.byId("RB_id_bugDescription").setValue(Data.BugDescription).setEditable(false);
                this.byId("RB_id_RaisedBy").setValue(Data.RaisedBy).setEditable(false);
                this.byId("RB_id_Email").setValue(Data.Email).setEditable(false);
                
                this.byId("RB_id_FileUploader1").setVisible(false);
                this.byId("idAddImageLabel").setVisible(false);
                this.byId("RB_id_ImageBox").setVisible(false);
                this.byId("RB_id_comments").setValue("").setVisible(true).setValueState("None");

            },
            onCommentsChange:function(oEvent){
                utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
            },
           onBugTableSelectionChange: function () {
    var oTable = this.byId("idBugTable");
    var oSelectedItem = oTable.getSelectedItem();
    var oButton = this.byId("ideditButton");
    var oresolveButton = this.byId("idresolveButton");


    if (!oSelectedItem) {
        oButton.setEnabled(false);
        return;
    }

    var oData = oSelectedItem.getBindingContext("RaiseBugModel").getObject();

    oButton.setEnabled(oData.Status !== "Resolved");
    oresolveButton.setEnabled(oData.Status !== "Resolved");

},
            onBugSubmit:function(){
                 var table = this.byId("idBugTable");
            var selected = table.getSelectedItem();
            var oContext = selected.getBindingContext("RaiseBugModel");
            var Data = oContext.getObject();

                      
           if (
                !utils._LCvalidateMandatoryField(this.byId("RB_id_comments"), "ID")
            ){
                MessageToast.show(this.i18nModel.getText("MSfillallfields"));
                 return;
            }

               this.getBusyDialog();
            this.ajaxCreateWithJQuery("sendmailtoCustomer", 
                {
                 "BugID": Data.BugID,
                "Email": Data.Email,
                "Name": Data.RaisedBy,
                "Comment": this.byId("RB_id_comments").getValue(),
                "Status": "Customer Action",
                "CommentedBy":this.getView().getModel("LoginModel").getData().EmployeeName,
                "CommentDateTime":new Date().toISOString(),
                "ApplicationName":"HM_Raisebug"

            })
                .then((oData) => {
                     this.CD_read();
                    this.ED_Dialog.close();
                })
                .catch((oError) => {
                    MessageToast.show("Error while updating Bug request");
                })
                .finally(() => {
                    this.closeBusyDialog();
                    MessageToast.show("Bug Updated Successfully");
                    table.removeSelections()
                    this.ED_Dialog.close();

                });   
        },
        RB_onCancelButtonPress: function () {
            this.byId("idBugTable").removeSelections()
            if (this.ED_Dialog) {
                this.ED_Dialog.close();
            }
        },
      HF_viewComments: async function (oEvent) {
    var that = this;

    var oContext = oEvent.getSource().getBindingContext("RaiseBugModel");
    var oObject = oContext.getObject();

    var sBugID = oObject.BugID;
    var sResolvedDescription = oObject.ResolvedDescription;
    var sResolvedDate = oObject.ResolvedDate;


    var filters = {
        BugID: sBugID
    };

    try {
        this.getBusyDialog();

        var oData = await this.ajaxReadWithJQuery("HM_BugComment", filters);

        var aComments = Array.isArray(oData.data) ? oData.data : [];

        // Add Resolved Description as the last timeline item
        if (sResolvedDescription && sResolvedDescription.trim()) {

        

            aComments.push({
                CommentedBy: "Support Team", // Change if required
                CommentDateTime: new Date(sResolvedDate),
                Status: "Resolved",
                Comment: sResolvedDescription
            });
        }

        var oJsonModel = new sap.ui.model.json.JSONModel(aComments);

        this.closeBusyDialog();

        if (!that._oCommentDialog) {

            var oTimeline = new sap.suite.ui.commons.Timeline({
                enableScroll: true,
                showHeaderBar: false,
                content: {
                    path: "/",
                    template: new sap.suite.ui.commons.TimelineItem({
                        userName: "{CommentedBy}",
                        dateTime: "{CommentDateTime}",
                        title: "{Status}",
                        text: "{Comment}"
                    })
                }
            });

            oTimeline.setModel(oJsonModel);

            that._oCommentDialog = new sap.m.Dialog({
                title: "Bug Comments",
                contentWidth: "25rem",
                contentHeight: "15rem",
                verticalScrolling: false,
                horizontalScrolling: false,
                draggable: true,
                resizable: true,
                content: [oTimeline],
                endButton: new sap.m.Button({
                    text: "Close",
                    press: function () {
                        that._oCommentDialog.close();
                    }
                })
            });

            that.getView().addDependent(that._oCommentDialog);

        } else {
            that._oCommentDialog.getContent()[0].setModel(oJsonModel);
        }

        that._oCommentDialog.open();

    } catch (oError) {
        this.closeBusyDialog();
        console.error(oError);
        sap.m.MessageToast.show("Failed to load comments.");
    }
}

         
    });
});

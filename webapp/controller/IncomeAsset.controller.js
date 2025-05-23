
sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter",
    'sap/ui/export/Spreadsheet',
    "sap/ui/core/Core",
    "sap/ui/core/BusyIndicator",


],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Formatter, Spreadsheet, Core, BusyIndicator) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.IncomeAsset", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteIncomeAsset").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched:async function () {
                 var LoginFunction = await this.commonLoginFunction("IncomeAsset");
                if (!LoginFunction) return;


                

                this.commonLoginFunction("IncomeAsset");
                let loginModel = this.getView().getModel("LoginModel").getData();
                // if (loginModel.Role === "IT Consultant") {
                //   await  this._fetchCommonData("BaseLocation", "branchModel")
                //     let branchData = await this.getOwnerComponent().getModel("branchModel").getData() || [];
                //     let branch = branchData.find(item => item.branchCode == loginModel.BranchCode) ;
                //        if (branch) {
                //         loginModel.BranchName = branch.city;
                //     }   
                //         this.IA_CommonReadCall( loginModel.BranchName);            
                //  } else {
                //     this.IA_CommonReadCall("");
                // }
               this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                var model = new JSONModel({
                    "Type": "",
                    "Model": "",
                    "Description": "",
                    "EquipmentNumber": "",
                    "SerialNumber": "",
                    "AssetCreationDate": "",
                    "AssignBranch": "",
                    "Status": "Unassigned",
                    "Currency": "INR",
                    "TrashDate": "",
                    "PickedEmployeeName": loginModel.EmployeeName,
                    "PickedEmployeeID": "",
                    "TransferDate": "",
                    "TransferBranch": "",
                    "PickedBranch":"",
                    "Comments":"",
                    "TrashComments":"",
                    "minDate":new Date(),
                    "TransferByName":"",
                    "TransferByID":"",
                    "TrashByEmployeeName":"",
                    "TrashByEmployeeID":""




                })
                this.getView().setModel(model, "CreateIncomeAssetModel");

                var oModel = new JSONModel({ "Save": false, "Tranfer": false, "PicedBy": false, maxDate: new Date(new Date().setDate(new Date().getDate() - 30)), minDate: new Date() });
                this.getView().setModel(oModel, "VisiableModel")
                this.Visible = this.getView().getModel("VisiableModel");
                this.IA_CommonReadCall("");
                this._fetchCommonData("AssetType", "oAssetTypeModel");
                this._fetchCommonData("Currency", "oCurrencyModel");
                this._fetchCommonData("BaseLocation", "branchModel")
            
                
                 
                this._FragmentDatePickersReadOnly(["FCIA_id_Date"])
                this._fetchCommonData("AllLoginDetails", "EmpModel", {})
                

                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Company Asset");

            },
             onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.CommonLogoutFunction()
            },
            IA_CommonReadCall: function (filter) {
                this.getBusyDialog()
              
                this.ajaxReadWithJQuery("IncomeAsset", "IsCurrent=1").then((oData) => {
                    let loginModel = this.getView().getModel("LoginModel").getData();
                    var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                   this.getOwnerComponent().setModel(new JSONModel(oFCIAerData), "incomeModel");

                    // if (loginModel.Role === "IT Consultant") {
                    //     const filteredData = oFCIAerData.filter(item => item.PickedBranch === loginModel.BranchName);
                    //     this.getOwnerComponent().setModel(new JSONModel(filteredData), "incomeModel");
                    // } else {
                    // }
                    this._populateUniqueFilterValues(oFCIAerData);
                                         
                    this.closeBusyDialog()
                }).catch((error) => {
                    this.closeBusyDialog()

                    MessageToast.show(error.message || error.responseText);
                });
            },        
                _populateUniqueFilterValues: function (data) {
                let uniqueValues = {
                    IA_id_SlNo: new Set(),
                    IA_id_EqNo: new Set(),
                   };

                data.forEach(item => {
                    uniqueValues.IA_id_SlNo.add(item.SerialNumber);
                    uniqueValues.IA_id_EqNo.add(item.EquipmentNumber);
                   });

                let oView = this.getView();
                ["IA_id_EqNo", "IA_id_SlNo"].forEach(field => {
                    let oComboBox = oView.byId(field);
                    oComboBox.destroyItems();
                    Array.from(uniqueValues[field]).sort().forEach(value => {
                        oComboBox.addItem(new sap.ui.core.Item({    
                            key: value,
                            text: value
                        }));
                    });
                });
            },
            Branchname:function(){
            const loginBranchCode = this.getView().getModel("LoginModel").getProperty("/BranchCode");
                const baseData = this.getView().getModel("branchModel").getData();
            
                const matchedBranch = baseData.find(branch => branch.branchCode === loginBranchCode);
            
                if (matchedBranch) {
                    const branchName = matchedBranch.city;
                    this.getView().getModel("CreateIncomeAssetModel").setProperty("/PickedBranch", branchName);
                      const branchControl = sap.ui.getCore().byId("FCIA_id_branch");
                    if (branchControl) {
                        branchControl.setSelectedKey(branchName);
                    }
                } else {
                    console.warn("Branch not found for BranchCode:", loginBranchCode);
                }
            },
            IA_onCreateButtonPress: function () {
                this.Branchname()
                var oModel = this.getView().getModel("CreateIncomeAssetModel")
                var table = this.getView().byId("IA_id_OdataTable")
                var data = this.getView().getModel("incomeModel").getData()
                var loginRole = this.getView().getModel("LoginModel").getProperty("/Role");
                  
                if (!this.FCIA_Dialog) {
                    var oView = this.getView();
                    this.FCIA_Dialog = sap.ui.xmlfragment("sap.kt.com.minihrsolution.fragment.CreateIncomeAsset", this);
                    oView.addDependent(this.FCIA_Dialog);
                    oModel.setProperty("/SetVisibleSave", true)
                    var oSimpleForm = sap.ui.getCore().byId("FCIA_id_SimpleFormChange354wide");
                    if (oSimpleForm) {
                        oSimpleForm.setLayout(sap.ui.layout.form.SimpleFormLayout.ColumnLayout);
                    }

                    this._FragmentDatePickersReadOnly(["FCIA_id_Date"]);
                    var oDatePicker = sap.ui.getCore().byId("FCIA_id_Date");
                                        if (oDatePicker) {
                                            var oToday = new Date();
                                            var maxdate = new Date(oToday)
                                            maxdate.setDate(maxdate.getDate() - 30)                                           
                                             oDatePicker.setMinDate(oToday);
                                            oDatePicker.setMaxDate(maxdate)
                                        }
                    
                    //  var oAssignedDate = oRowData.TransferDate
                    //     if (oAssignedDate) {
                    //         var oMinDate = new Date(oAssignedDate);
                    //         var oMaxDate = new Date(oAssignedDate);
                    //         oMaxDate.setDate(oMaxDate.getDate() +365);
                    //         sap.ui.getCore().byId("FCIA_id_Date").setMinDate(oMinDate).setMaxDate(oMaxDate);
                    //     }

                    sap.ui.getCore().byId("FCIA_id_transferdate").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_transferbranch").setVisible(false)

                    sap.ui.getCore().byId("FCIA_id_pickButton").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_transferButton").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_pickbranch").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_Date").setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_transferBy").setVisible(false)
                    // sap.ui.getCore().byId("FCIA_id_branch").setSelectedKey(oModel.getProperty("/PickedBranch")).setValueState("None");
                    // sap.ui.getCore().byId("FCIA_id_pickedby").setVisible(true).setEditable(true)

                    
                    // if (loginRole === "IT Consultant") {
                    //     sap.ui.getCore().byId("FCIA_id_branch").setEditable(false);
                    //     sap.ui.getCore().byId("FCIA_id_pickedby").setEditable(false);
                        
                    // }

 
                   table.removeSelections();
                    this.FCIA_Dialog.open();

                } else {               
                         this.FCIA_Dialog.open();

                    var oModel = this.getView().getModel("CreateIncomeAssetModel")
                    var oSimpleForm = sap.ui.getCore().byId("FCIA_id_SimpleFormChange354wide");
                    if (oSimpleForm) {
                        oSimpleForm.setLayout(sap.ui.layout.form.SimpleFormLayout.ColumnLayout);
                    }

                     

                                  var oDatePicker = sap.ui.getCore().byId("FCIA_id_Date");
                                        if (oDatePicker) {
                                            var oToday = new Date();
                                            var maxdate = new Date(oToday)
                                            maxdate.setDate(maxdate.getDate() - 30)                                           
                                             oDatePicker.setMinDate(oToday);
                                            oDatePicker.setMaxDate(maxdate)
                                        }

                    sap.ui.getCore().byId("FCIA_id_type").setEditable(true).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_type").setSelectedKey("")
                    sap.ui.getCore().byId("FCIA_id_model").setEditable(true).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_model").setValue("").setValueState("None").setEditable(true).setVisible(true)
                    sap.ui.getCore().byId("FCIA_ID_DescriptionTextArea").setValue("").setValueState("None").setEditable(true).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_eqno").setValue("").setValueState("None").setEditable(true).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_slno").setValue("").setValueState("None").setEditable(true).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_pickedby").setVisible(true).setEditable(true)
                    sap.ui.getCore().byId("FCIA_id_Date").setValue("").setValueState("None").setVisible(true).setEditable(true)
                    sap.ui.getCore().byId("FCIA_id_branch").setSelectedKey(oModel.getProperty("/PickedBranch")).setValueState("None");
                    sap.ui.getCore().byId("FCIA_id_branch").setVisible(true).setEditable(true)
                    sap.ui.getCore().byId("FCIA_id_pickbranch").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_assetvalue").setValue("").setValueState("None").setEditable(true).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_currency").setEditable(true).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_currency").setValue("INR")
                    sap.ui.getCore().byId("FCIA_id_currency").setSelectedKey("")
                    sap.ui.getCore().byId("FCIA_id_transferBy").setVisible(false)



                    oModel.setProperty("/SetVisibleSave", false)
                    sap.ui.getCore().byId("FCIA_id_transferdate").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_transferbranch").setVisible(false)

                    sap.ui.getCore().byId("FCIA_id_pickButton").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_transferButton").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_saveButton").setVisible(true)

            //   if (loginRole === "IT Consultant") {
            //             sap.ui.getCore().byId("FCIA_id_branch").setEditable(false);
            //             sap.ui.getCore().byId("FCIA_id_pickedby").setEditable(false);
            //                }
                    table.removeSelections();

                }
            },

            FCIA_onInputLiveChange: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            FCIA_oneqnolivechange: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            FCIA_onslnoInputLiveChange: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            FCIA_onpickbyInputLiveChange: function (oEvent) {
                utils._LCvalidateName(oEvent);
            },
            FCIA_onassetvalueInputLiveChange: function (oEvent) {
                utils._LCvalidateAssetValueField(oEvent);
            },
            FCIA_ondatechange: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            FCIA_assetammountlivechange: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
            },
            FCIA_onbranchchange: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
            },
            FCIA_onDescriptionTextAreaChange: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },


            FCIA_onsavebuttonpress: async function () {
                var table = this.byId("IA_id_OdataTable");
                var selected = table.getSelectedItem();
                             var model=this.getView().getModel("incomeModel").getData()
                var oModel = this.getView().getModel("CreateIncomeAssetModel").getData()
                var type=sap.ui.getCore().byId("FCIA_id_type").getSelectedKey() || "Laptop"
                try {
                    if (
                          utils._LCstrictValidationComboBox(sap.ui.getCore().byId("FCIA_id_branch"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FCIA_id_model"), "ID")
                        &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FCIA_ID_DescriptionTextArea"), "ID") &&

                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FCIA_id_slno"), "ID") &&
                        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FCIA_id_eqno"), "ID") &&

                        utils._LCvalidateDate(sap.ui.getCore().byId("FCIA_id_Date"), "ID") &&
                        utils._LCvalidateAmount(sap.ui.getCore().byId("FCIA_id_assetvalue"), "ID")
                    ) {
                        var selectedBranch = sap.ui.getCore().byId("FCIA_id_branch").getSelectedItem();

                        if (!selectedBranch) {
                    MessageToast.show(this.i18nModel.getText("branchmessage"));
                            return;
                        }

                        var oPayLoad = {
                            "Type": type,
                            "Model": oModel.Model,
                            "Description": oModel.Description,
                            "EquipmentNumber": oModel.EquipmentNumber,
                            "SerialNumber": oModel.SerialNumber,
                            "PickedEmployeeName": oModel.PickedEmployeeName,
                            "AssetCreationDate": oModel.AssetCreationDate.split("/").reverse().join("-"),
                            "PickedBranch": oModel.PickedBranch,
                            "AssetValue": oModel.AssetValue,
                            "Currency": oModel.Currency,
                            "TransferBranch": "",
                            "TransferDate": "",
                            "IsCurrent": "1",
                            "Status": "Available",
                            "TrashDate": null,
                            "PickedEmployeeID": sap.ui.getCore().byId("FCIA_id_pickedby").getSelectedItem().getAdditionalText()
                        };


                        if (!selected) {
                            await this.ajaxCreateWithJQuery("IncomeAsset", { data: oPayLoad });
                            MessageToast.show(this.i18nModel.getText("assetcreate"));



                        } else {
                            var selectedData = selected.getBindingContext("incomeModel").getObject();
                            await this.ajaxUpdateWithJQuery("IncomeAsset", { data: oPayLoad, filters: { ID: selectedData.ID } });
                            MessageToast.show(this.i18nModel.getText("assetupdate"));

                        }

                        this.IA_onSearch();
                        this._populateUniqueFilterValues(model); 
                        this.FCIA_Dialog.close();

                    }
                    else {
                        MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                    }
                } catch (e) {
                    MessageToast.show(this.i18nModel.getText("technicalError"));

                    console.error(e);
                }
            },
            FCIA_onpickButtonPress: async function (oEvent) {

                // var oButton = oEvent.getSource();
                // var oContext = oButton.getBindingContext("incomeModel");
                // if (oContext) {
                //     var rowData = oContext.getObject();                 
                //     var ID = rowData.ID;
                // }          
                // var item=oEvent.getSource().getBindingContext("incomeModel").getObject().ID 
                var data = this.getView().getModel("incomeModel").getData()
                var oModel = this.getView().getModel("CreateIncomeAssetModel").getData();

                if (
                    utils._LCvalidateDate(sap.ui.getCore().byId("FCIA_id_Date"), "ID") &&
                    utils._LCstrictValidationComboBox(sap.ui.getCore().byId("FCIA_id_pickbranch"), "ID")
                )
              
                {
                    var selectedBranch = sap.ui.getCore().byId("FCIA_id_pickbranch").getSelectedItem();

                    if (!selectedBranch) {
                MessageToast.show(this.i18nModel.getText("branchmessage"));
                        return;
                    }
                    var oPayLoad = {
                        "Type": data.Type,
                        "Model": data.Model,
                        "Description": data.Description,
                        "EquipmentNumber": data.EquipmentNumber,
                        "SerialNumber": data.SerialNumber,
                        "PickedEmployeeName": oModel.PickedEmployeeName,
                        "AssetCreationDate": oModel.AssetCreationDate.split("/").reverse().join("-"),
                        // "PickedBranch": data.PickedBranch,
                        "AssetValue": data.AssetValue,
                        "Currency": data.Currency,
                        "Status": "Available",
                        "TrashDate": null,
                        "PickedEmployeeID": sap.ui.getCore().byId("FCIA_id_pickedby").getSelectedItem().getAdditionalText(),
                        "PickedBranch":oModel.PickedBranch,
                    };

                    await this.ajaxUpdateWithJQuery("IncomeAsset", { data: oPayLoad, filters: { ID: this.item } });

                    MessageToast.show(this.i18nModel.getText("picked"));
                    
                    this.IA_onSearch();
                    this.FCIA_Dialog.close();
                }else{     
                      MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                }
            
            },
            FCIA_onTransferbuttonpress: async function () {
        //          var typeKey = sap.ui.getCore().byId("FCIA_id_type").getSelectedKey();
        //    this.getView().getModel("CreateIncomeAssetModel").setProperty("/Type", typeKey);
                var type=sap.ui.getCore().byId("FCIA_id_type").getSelectedKey() || "Laptop"
               
                var oModel = this.getView().getModel("CreateIncomeAssetModel").getData()
                var Model = this.getView().getModel("incomeModel").getData()

                if (utils._LCvalidateDate(sap.ui.getCore().byId("FCIA_id_transferdate"), "ID")
                    && utils._LCstrictValidationComboBox(sap.ui.getCore().byId("FCIA_id_transferbranch"), "ID")
                ) 
               
                {
                     var selectedBranch = sap.ui.getCore().byId("FCIA_id_transferbranch").getSelectedItem();

                if (!selectedBranch) {
                    MessageToast.show(this.i18nModel.getText("branchmessage"));
                            return;
                        }
                    var oPayLoad = {
                        "Type":type,
                        "Model": oModel.Model,
                        "Description": oModel.Description,
                        "EquipmentNumber": oModel.EquipmentNumber,
                        "SerialNumber": oModel.SerialNumber,
                        "AssetValue": oModel.AssetValue,
                        "Currency": oModel.Currency,
                        // "PickedBranch": oModel.PickedBranch,
                        // "PickedEmployeeName": oModel.PickedEmployeeName,
                        // "AssetCreationDate":oModel.AssetCreationDate.split("/").reverse().join("-"),
                        "Status": "Transferred",
                        "TrashDate": null,
                        "IsCurrent": "1",
                        // "PickedEmployeeID":sap.ui.getCore().byId("FCIA_id_pickedby").getSelectedItem().getAdditionalText(),
                        "TransferBranch": oModel.TransferBranch,
                        "TransferDate": oModel.TransferDate.split("/").reverse().join("-"),
                        "TransferByName":sap.ui.getCore().byId("FCIA_id_transferBy").getSelectedKey(),
                        "TransferByID":sap.ui.getCore().byId("FCIA_id_transferBy").getSelectedItem().getAdditionalText()

                    }
                    await this.ajaxCreateWithJQuery("IncomeAsset", { data: oPayLoad }).then( ()=>{
                      MessageToast.show(this.i18nModel.getText("transfer"));
                    this.IA_onSearch();
                    this.FCIA_Dialog.close();
                }).catch((error)=>{
                      MessageToast.show("error");
                })
                  
                }else{
                   sap.m.MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                }
            },
            IA_onUpadateButtonPress:async function () {

                var table = this.byId("IA_id_OdataTable");
                var selected = table.getSelectedItem();
                if (!selected) {
                    MessageToast.show(this.i18nModel.getText("selectUpdateRow"));

                    return;
                }
                var Model = selected.getBindingContext("incomeModel");
                var data = Model.getObject();

                   

                var loginRole = this.getView().getModel("LoginModel").getProperty("/Role");


                var oModel = this.getView().getModel("CreateIncomeAssetModel");
                if (data.Status === "Trashed") {
                    MessageToast.show(this.i18nModel.getText("updatemessage"));
                    return;
                }
                if (data.Status === "Assigned") {
                    MessageToast.show(this.i18nModel.getText("assignedstatus"));
                    return;
                }
                if (data.Status === "Transferred") {
                    MessageToast.show(this.i18nModel.getText("transferredstatus"));
                    return;
                }
                if (data.Status === "Returned") {
                    MessageToast.show(this.i18nModel.getText("returndata"));
                    return;
                }
                 await this.ajaxReadWithJQuery("IncomeAsset").then((oData) => {
                    let loginModel = this.getView().getModel("LoginModel").getData();
                    var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                   this.getOwnerComponent().setModel(new JSONModel(oFCIAerData), "EditModel");
                     })
                
                            if(this.getView().getModel("EditModel").getData().filter((item) => item.SerialNumber === data.SerialNumber).length > 1) {
                             MessageToast.show(this.i18nModel.getText("Editing this row is not allowed"));
                                return;
                            }

                if (!this.FCIA_Dialog) {
                    var oView = this.getView();
                    this.FCIA_Dialog = sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.CreateIncomeAsset",
                        controller: this
                    }).then(function (FCIA_Dialog) {
                        this.FCIA_Dialog = FCIA_Dialog;
                        oView.addDependent(this.FCIA_Dialog);
                        var oSimpleForm = sap.ui.getCore().byId("FCIA_id_SimpleFormChange354wide");
                        if (oSimpleForm) {
                            oSimpleForm.setLayout(sap.ui.layout.form.SimpleFormLayout.ColumnLayout);
                        }
                         var oDatePicker = sap.ui.getCore().byId("FCIA_id_Date");
                                        if (oDatePicker) {
                                            var oToday = new Date();
                                            var maxdate = new Date(oToday)
                                            maxdate.setDate(maxdate.getDate() - 30)                                           
                                             oDatePicker.setMinDate(oToday);
                                            oDatePicker.setMaxDate(maxdate)
                                        }
                        this._FragmentDatePickersReadOnly(["FCIA_id_Date"])
                        sap.ui.getCore().byId("FCIA_id_pickButton").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_transferButton").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_saveButton").setVisible(true)
                        sap.ui.getCore().byId("FCIA_id_pickbranch").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_transferBy").setVisible(false)


                        oModel.setProperty("/Type", data.Type);
                        oModel.setProperty("/Model", data.Model);
                        oModel.setProperty("/Description", data.Description);
                        oModel.setProperty("/EquipmentNumber", data.EquipmentNumber);
                        oModel.setProperty("/SerialNumber", data.SerialNumber);
                        oModel.setProperty("/PickedEmployeeName", data.PickedEmployeeName);
                        sap.ui.getCore().byId("FCIA_id_Date").setDateValue(new Date(data.AssetCreationDate)).setValueState("None");
                        oModel.setProperty("/PickedBranch", data.PickedBranch);
                        oModel.setProperty("/AssetValue", data.AssetValue);
                        oModel.setProperty("/Currency", data.Currency);
                        sap.ui.getCore().byId("FCIA_id_transferdate").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_transferbranch").setVisible(false)

                    //      if (loginRole === "IT Consultant") {
                    //     sap.ui.getCore().byId("FCIA_id_branch").setEditable(false);
                    // }
                                 this.FCIA_Dialog.open();
                    }.bind(this));
                } else {
                    var oSimpleForm = sap.ui.getCore().byId("FCIA_id_SimpleFormChange354wide");
                    if (oSimpleForm) {
                        oSimpleForm.setLayout(sap.ui.layout.form.SimpleFormLayout.ColumnLayout);
                    }
                      var oDatePicker = sap.ui.getCore().byId("FCIA_id_Date");
                                        if (oDatePicker) {
                                            var oToday = new Date();
                                            var maxdate = new Date(oToday)
                                            maxdate.setDate(maxdate.getDate() - 30)                                           
                                             oDatePicker.setMinDate(oToday);
                                            oDatePicker.setMaxDate(maxdate)
                                        }
                    this.FCIA_Dialog.open();
                    var oCore = sap.ui.getCore()
                    oCore.byId("FCIA_id_type").setSelectedKey(data.Type).setEditable(true).setVisible(true);
                    oCore.byId("FCIA_id_model").setValue(data.Model).setValueState("None").setEditable(true).setVisible(true);
                    oModel.setProperty("/Description", data.Description)
                    sap.ui.getCore().byId("FCIA_ID_DescriptionTextArea").setValue(data.Description).setValueState("None").setEditable(true).setVisible(true)
                    oCore.byId("FCIA_id_eqno").setValue(data.EquipmentNumber).setValueState("None").setEditable(true).setVisible(true);
                    oCore.byId("FCIA_id_slno").setValue(data.SerialNumber).setValueState("None").setEditable(true).setVisible(true);
                    oCore.byId("FCIA_id_pickedby").setValue(data.PickedEmployeeName)
                    oCore.byId("FCIA_id_pickedby").setVisible(true);

                    oCore.byId("FCIA_id_Date").setDateValue(new Date(data.AssetCreationDate)).setValueState("None").setEditable(true).setVisible(true);
                    oCore.byId("FCIA_id_branch").setSelectedKey(data.PickedBranch).setValueState("None").setVisible(true).setEditable(true);
                    oCore.byId("FCIA_id_pickbranch").setVisible(false)
                    oCore.byId("FCIA_id_assetvalue").setValue(data.AssetValue).setValueState("None").setEditable(true).setVisible(true);
                    oCore.byId("FCIA_id_currency").setSelectedKey(data.Currency).setEditable(true).setVisible(true);
                    sap.ui.getCore().byId("FCIA_id_transferdate").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_transferbranch").setVisible(false)

                    sap.ui.getCore().byId("FCIA_id_pickButton").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_transferButton").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_saveButton").setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_transferBy").setVisible(false)

                    //  if (loginRole === "IT Consultant") {
                    //     sap.ui.getCore().byId("FCIA_id_branch").setEditable(false);
                    // }

                    this._FragmentDatePickersReadOnly(["FCIA_id_Date"])
                }
            },

            IA_onPickedButtonPress: function (oEvent) {
                this.item = oEvent.getSource().getBindingContext("incomeModel").getObject().ID
                var oRowData = oEvent.getSource().getBindingContext("incomeModel").getObject();
                var oModel = this.getView().getModel("CreateIncomeAssetModel");

                if (!this.FCIA_Dialog) {
                    var oView = this.getView();
                    this.FCIA_Dialog = sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.CreateIncomeAsset",
                        controller: this
                    }).then(function (FCIA_Dialog) {
                        this.FCIA_Dialog = FCIA_Dialog;
                        oView.addDependent(this.FCIA_Dialog);
                        var oSimpleForm = sap.ui.getCore().byId("FCIA_id_SimpleFormChange354wide");
                        if (oSimpleForm) {
                            oSimpleForm.setLayout(sap.ui.layout.form.SimpleFormLayout.ResponsiveGridLayout);
                        }
                        this._FragmentDatePickersReadOnly(["FCIA_id_transferdate"])

                        var oAssignedDate = oRowData.TransferDate
                        if (oAssignedDate) {
                            var oMinDate = new Date(oAssignedDate);
                            var oMaxDate = new Date(oAssignedDate);
                            oMaxDate.setDate(oMaxDate.getDate() +365);
                            sap.ui.getCore().byId("FCIA_id_Date").setMinDate(oMinDate).setMaxDate(oMaxDate);
                        }

                        sap.ui.getCore().byId("FCIA_id_pickButton").setVisible(true)
                        sap.ui.getCore().byId("FCIA_id_saveButton").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_transferButton").setVisible(false)
                       sap.ui.getCore().byId("FCIA_id_transferBy").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_pickbranch").setVisible(true).setValueState("None").setSelectedKey(oRowData.TransferBranch).setEditable(false)


                        sap.ui.getCore().byId("FCIA_id_type").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_model").setVisible(false)
                        sap.ui.getCore().byId("FCIA_ID_DescriptionTextArea").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_eqno").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_slno").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_pickedby").setVisible(true)
                        sap.ui.getCore().byId("FCIA_id_Date").setVisible(true).setValueState("None").setEditable(true)
                        sap.ui.getCore().byId("FCIA_id_branch").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_pickbranch").setVisible(true).setValueState("None").setSelectedKey(oRowData.TransferBranch).setEditable(false)
                        sap.ui.getCore().byId("FCIA_id_assetvalue").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_currency").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_transferdate").setVisible(false)
                        sap.ui.getCore().byId("FCIA_id_transferbranch").setVisible(false)

                        this.FCIA_Dialog.open();
                    }.bind(this));
                } else {
                    this.FCIA_Dialog.open();

                    var oSimpleForm = sap.ui.getCore().byId("FCIA_id_SimpleFormChange354wide");
                    if (oSimpleForm) {
                        oSimpleForm.setLayout(sap.ui.layout.form.SimpleFormLayout.ResponsiveGridLayout);
                    }

                     var oAssignedDate = oRowData.TransferDate
                        if (oAssignedDate) {
                            var oMinDate = new Date(oAssignedDate);
                            var oMaxDate = new Date(oAssignedDate);
                            oMaxDate.setDate(oMaxDate.getDate() +365);
                            sap.ui.getCore().byId("FCIA_id_Date").setMinDate(oMinDate).setMaxDate(oMaxDate);
                        }

                    sap.ui.getCore().byId("FCIA_id_type").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_model").setVisible(false)
                    sap.ui.getCore().byId("FCIA_ID_DescriptionTextArea").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_eqno").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_slno").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_pickedby").setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_Date").setVisible(true).setValue("").setValueState("None").setEditable(true)
                    sap.ui.getCore().byId("FCIA_id_branch").setVisible(false).setSelectedKey("")
                    sap.ui.getCore().byId("FCIA_id_pickbranch").setVisible(true).setSelectedKey(oRowData.TransferBranch).setValueState("None").setEditable(false)
                    sap.ui.getCore().byId("FCIA_id_assetvalue").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_currency").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_transferdate").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_transferbranch").setVisible(false)

                    sap.ui.getCore().byId("FCIA_id_pickButton").setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_saveButton").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_transferButton").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_transferBy").setVisible(false)

                    this._FragmentDatePickersReadOnly(["FCIA_id_Date"])
                }
            },

            IA_onTrashButtonPress: function () {
                  var oModel = new JSONModel(this.getView().getModel("EmpModel").getData().filter((item) => item.Role === "Admin" || item.Role === "IT Manager"));
                this.getView().setModel(oModel, "AdminModel");
                var table = this.byId("IA_id_OdataTable");
                var selected = table.getSelectedItem();
                if (!selected) {
                    return MessageToast.show(this.i18nModel.getText("selectTrashRow"));
                }
                var Model = selected.getBindingContext("incomeModel");
                var data = Model.getObject();
                if (data.Status === "Trashed") {
                    MessageToast.show(this.i18nModel.getText("rowTrashed"));
                    return;
                } else if (data.Status === "Assigned") {
                    MessageToast.show(this.i18nModel.getText("assigned"));
                    return;
                }

                if (data.Status === "Transferred") {
                    MessageToast.show(this.i18nModel.getText("transferreddatatrashed"));
                    return;

                }

                if (!selected) {
                    MessageToast.show(this.i18nModel.getText("selectTrashRow"));
                }
                if (!this.TF_Dialog) {
                    var oView = this.getView();
                    this.TF_Dialog = sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.TrashIncomeAsset",
                        controller: this
                    }).then(function (TF_Dialog) {
                        this.TF_Dialog = TF_Dialog;
                        oView.addDependent(this.TF_Dialog);
                        this._FragmentDatePickersReadOnly(["FTIA_id_Date"])
                        if(data.Status==="Available"){
                          var oAssignedDate = data.AssetCreationDate;
                          if (oAssignedDate) {
                              var oMinDate = new Date(oAssignedDate);
                              sap.ui.getCore().byId("FTIA_id_Date").setMinDate(oMinDate);
                          }
                        }else if(data.ReturnDate){
                          var oMinDate = new Date(data.ReturnDate);
                          sap.ui.getCore().byId("FTIA_id_Date").setMinDate(oMinDate);
                        }                        
                            if (selected) {
                            this.TF_Dialog.open();
                        }
                    }.bind(this));
                } else if (selected) {
                     if(data.Status==="Available"){
                          var oAssignedDate = data.AssetCreationDate;
                          if (oAssignedDate) {
                              var oMinDate = new Date(oAssignedDate);
                              sap.ui.getCore().byId("FTIA_id_Date").setMinDate(oMinDate);
                          }
                        }else if(data.ReturnDate){
                          var oMinDate = new Date(data.ReturnDate);
                          sap.ui.getCore().byId("FTIA_id_Date").setMinDate(oMinDate);
                        } 
                    this.TF_Dialog.open();
                    sap.ui.getCore().byId("FTIA_id_Date").setValue("").setValueState("None")
                    sap.ui.getCore().byId("FTIA_id_Comments").setValue("").setValueState("None")
                     }
                else{
                    sap.ui.getCore().byId("FTIA_id_Date").setValue("").setValueState("None")
                    sap.ui.getCore().byId("FTIA_id_Comments").setValue("")
                    this.TF_Dialog.open();

                }
            },
            IA_onTransferButtonPress: function () {
                // this.Visible.setProperty("/Tranfer", false);
                //     this.Visible.setProperty("/Save", true);
                var oModel = new JSONModel(this.getView().getModel("EmpModel").getData().filter((item) => item.Role === "Admin"));
                this.getView().setModel(oModel, "AdminModel");
                var table = this.byId("IA_id_OdataTable");
                var selected = table.getSelectedItem();

                if (!selected) {
                    MessageToast.show(this.i18nModel.getText("selectarowtransfer"));

                    return;
                }
                var Model = selected.getBindingContext("incomeModel");
                var data = Model.getObject();

                if (data.Status === "Trashed" || data.Status === "Transferred" || data.Status === "Assigned") {
                    MessageToast.show(this.i18nModel.getText("thisdatashouldnotbetransferred"));
                    return;
                }
                var Model = selected.getBindingContext("incomeModel");
                var data = Model.getObject();
                if (!this.FCIA_Dialog) {
                    var oView = this.getView();
                    this.FCIA_Dialog = sap.ui.xmlfragment("sap.kt.com.minihrsolution.fragment.CreateIncomeAsset", this);
                    oView.addDependent(this.FCIA_Dialog);
                    this._FragmentDatePickersReadOnly(["FCIA_id_transferdate"]);

                    //  var oAssignedDate = data.AssetCreationDate;
                    //       if (oAssignedDate) {
                    //           var oMinDate = new Date(oAssignedDate);
                    //           sap.ui.getCore().byId("FCIA_id_transferdate").setMinDate(oMinDate);
                    //       }
                       if(data.Status==="Available"){
                          var oAssignedDate = data.AssetCreationDate;
                          if (oAssignedDate) {
                              var oMinDate = new Date(oAssignedDate);
                              sap.ui.getCore().byId("FCIA_id_transferdate").setMinDate(oMinDate);
                          }
                        }else if(data.ReturnDate){
                          var oMinDate = new Date(data.ReturnDate);
                          sap.ui.getCore().byId("FCIA_id_transferdate").setMinDate(oMinDate);
                        }  
                        
                        
                    sap.ui.getCore().byId("FCIA_id_saveButton").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_pickButton").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_transferButton").setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_transferBy").setVisible(true)


                    sap.ui.getCore().byId("FCIA_id_CancelButton").setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_type").setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_type").setSelectedKey(data.Type)
                    sap.ui.getCore().byId("FCIA_id_model").setValue(data.Model).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_ID_DescriptionTextArea").setValue(data.Description).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_eqno").setValue(data.EquipmentNumber).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_slno").setValue(data.SerialNumber).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_pickedby").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_pickbranch").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_assetvalue").setValue(data.AssetValue).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_currency").setValue(data.Currency)
                    sap.ui.getCore().byId("FCIA_id_currency").setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_transferdate").setValue("").setValueState("None").setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_transferbranch").setValue("").setVisible(true).setValueState("None")

                    if(data.IsCurrent==1 && data.Status=="Returned"){
                    sap.ui.getCore().byId("FCIA_id_branch").setValue(data.ReturnBranch).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_Date").setDateValue(new Date(data.ReturnDate)).setVisible(true).setEditable(false);

                    
                    }else{
                    sap.ui.getCore().byId("FCIA_id_branch").setValue(data.PickedBranch).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_Date").setDateValue(new Date(data.AssetCreationDate)).setVisible(true).setEditable(false);

                    }
                    this.FCIA_Dialog.open();
                } else {
                    this.FCIA_Dialog.open();

                    var oSimpleForm = sap.ui.getCore().byId("FCIA_id_SimpleFormChange354wide");
                    if (oSimpleForm) {
                        oSimpleForm.setLayout(sap.ui.layout.form.SimpleFormLayout.ColumnLayout);
                    }

                    // var oAssignedDate = data.AssetCreationDate;
                    // if (oAssignedDate) {
                    //     var oMinDate = new Date(oAssignedDate);
                    //     sap.ui.getCore().byId("FCIA_id_transferdate").setMinDate(oMinDate);
                    // }
                    if(data.Status==="Available"){
                          var oAssignedDate = data.AssetCreationDate;
                          if (oAssignedDate) {
                              var oMinDate = new Date(oAssignedDate);
                              sap.ui.getCore().byId("FCIA_id_transferdate").setMinDate(oMinDate);
                          }
                        }else if(data.ReturnDate){
                          var oMinDate = new Date(data.ReturnDate);
                          sap.ui.getCore().byId("FCIA_id_transferdate").setMinDate(oMinDate);
                        }  
                    
                    sap.ui.getCore().byId("FCIA_id_type").setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_type").setSelectedKey(data.Type)
                    sap.ui.getCore().byId("FCIA_id_model").setValue(data.Model).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_ID_DescriptionTextArea").setValue(data.Description).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_eqno").setValue(data.EquipmentNumber).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_slno").setValue(data.SerialNumber).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_pickedby").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_pickbranch").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_assetvalue").setValue(data.AssetValue).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_currency").setValue(data.Currency)
                    sap.ui.getCore().byId("FCIA_id_currency").setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_transferdate").setValue("").setValueState("None").setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_transferbranch").setValue("").setVisible(true).setValueState("None")

                    sap.ui.getCore().byId("FCIA_id_saveButton").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_pickButton").setVisible(false)
                    sap.ui.getCore().byId("FCIA_id_transferButton").setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_transferBy").setVisible(true)

                  if(data.IsCurrent==1 && data.Status=="Returned"){
                    sap.ui.getCore().byId("FCIA_id_branch").setValue(data.ReturnBranch).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_Date").setDateValue(new Date(data.ReturnDate)).setVisible(true).setEditable(false);

                    
                    }else{
                    sap.ui.getCore().byId("FCIA_id_branch").setValue(data.PickedBranch).setEditable(false).setVisible(true)
                    sap.ui.getCore().byId("FCIA_id_Date").setDateValue(new Date(data.AssetCreationDate)).setVisible(true).setEditable(false);

                    }

                    table.removeSelections();

                }
            },
            FTIA_onsavepress: async function () {
                
                var oModel = this.getView().getModel("CreateIncomeAssetModel").getData()
                var Date = sap.ui.getCore().byId("FTIA_id_Date").getValue()
                var table = this.byId("IA_id_OdataTable");
                var selected = table.getSelectedItem();
                if (!selected) {
                    MessageToast.show(this.i18nModel.getText("selectTrashRow"));
                    return;
                }
                if (selected) {
                    var context = selected.getBindingContext("incomeModel");
                    var selectedData = context.getObject();
              if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FTIA_id_Date"), "ID") &&
                   utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FTIA_id_Comments"), "ID")) 
        {                       
                       selectedData.TrashDate = Date;
                        selectedData.Status = "Trashed";
                        var oPayLoad = {
                            "Status": "Trashed",
                            "TrashDate": Date,
                            "TrashByEmployeeName":sap.ui.getCore().byId("FCIA_id_trashBy").getSelectedKey(),
                            "TrashByEmployeeID":sap.ui.getCore().byId("FCIA_id_trashBy").getSelectedItem().getAdditionalText(),
                            "TrashComments":sap.ui.getCore().byId("FTIA_id_Comments").getValue()             
                                   };
                        await this.ajaxUpdateWithJQuery("IncomeAsset", { data: oPayLoad, filters: { ID: selectedData.ID }, });
                        MessageToast.show(this.i18nModel.getText("Trashed"));
                        this.IA_CommonReadCall("IncomeAsset")
                        this.TF_Dialog.close();
                        table.removeSelections();
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));

                    }
                } else {
                    MessageToast.show(this.i18nModel.getText("noRowSelected"));
                }
            },




            IA_onSearch: function () {

                var sEqNo = this.getView().byId("IA_id_EqNo").getSelectedKey();
                var sPickedBy = this.getView().byId("IA_id_PickedBy").getSelectedKey();
                var oDateRange = this.getView().byId("idOdataDateComboBox");
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
                var oStartDate = oDateRange.getDateValue();
                var oEndDate = oDateRange.getSecondDateValue();
                var slNo = this.getView().byId("IA_id_SlNo").getSelectedKey();
                var status = this.getView().byId("IA_id_Status").getSelectedKey();

                var filters = {
                    IsCurrent: "1"
                };

                if (sEqNo) {
                    filters.EquipmentNumber = sEqNo;
                }

                if (sPickedBy) {
                    filters.PickedEmployeeName = sPickedBy;
                }

                if (oStartDate && oEndDate) {
                    filters.CreationStartDate = oDateFormat.format(oStartDate);
                    filters.CreationEndDate = oDateFormat.format(oEndDate);
                }
                if (slNo) {
                    filters.SerialNumber = slNo;
                }
                if (status) {
                    filters.Status = status;
                }
                this.getBusyDialog();

                this._fetchCommonData("IncomeAsset", "incomeModel", filters).then(() => {
                 
                    const data = this.getView().getModel("incomeModel").getData();
                    this._populateUniqueFilterValues(data); 
                }).finally(() => {
                    this.closeBusyDialog()
     
                });
            },
            IA_onPressClear: function () {
                this.getView().byId("IA_id_EqNo").setSelectedKey("");
                this.getView().byId("IA_id_PickedBy").setSelectedKey("");
                this.getView().byId("idOdataDateComboBox").setValue("");
                this.getView().byId("IA_id_SlNo").setSelectedKey("");
                this.getView().byId("IA_id_Status").setSelectedKey("");
            },
            FTIA_onCancelPress: function () {
                var table = this.byId("IA_id_OdataTable");
                table.removeSelections();
                this.TF_Dialog.close();
            },
            FCIA_onCancelButtonPress: function () {

                this.closeBusyDialog()
                // this.Branchname()
                sap.ui.getCore().byId("FCIA_id_branch").setValue("")
                sap.ui.getCore().byId("FCIA_ID_DescriptionTextArea").setValueState("None")
                this.getView().byId("IA_id_OdataTable").removeSelections();
                this.FCIA_Dialog.close();

            },
            onColumnListItemPress:function(oEvent){
             
                var Slno = oEvent.getSource().getBindingContext("incomeModel").getObject().SerialNumber;
                var onav=this.getOwnerComponent().getRouter()
                onav.navTo("AssetObjectPage",{
                    sPath: Slno,Name:"IncomeAsset"
                })
            },
            IA_onExport: function () {
                const oTable = this.getView().byId("IA_id_OdataTable");
                const oModelData = oTable.getModel("incomeModel").getData().map(item => {
                    if (item.TransferDate === '1899-11-30T00:00:00.000Z'||item.ReturnDate === '1899-11-30T00:00:00.000Z' ) {
                        item.TransferDate = '';
                        item.ReturnDate='';
                    }
                    return item;
                });

                if (!oModelData || oModelData.length === 0) {
                    MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("noData"));
                    return;
                }
                const that = this;
                const aCols = [
                    { label: "Type", property: "Type", type: "string" },
                    { label: "Model", property: "Model", type: "string" },
                    { label: "Description", property: "Description", type: "string" },
                    { label: "Equipment No", property: "EquipmentNumber", type: "string" },
                    { label: "Serial No", property: "SerialNumber", type: "string" },
                    { label: "Picked By", property: "PickedEmployeeName", type: "string" },
                    { label: "Pickedby ID", property: "PickedEmployeeID", type: "string" },
                    { label: "Asset Creation Date", property: "AssetCreationDate", type: "Date", format: "yyyy-MM-dd" },
                    { label: "Branch", property: "PickedBranch", type: "string" },
                    { label: "Transfer By", property: "TransferByName", type: "string" },
                    { label: "TransferBy ID", property: "TransferByID", type: "string" },
                    { label: "TransferBranch", property: "TransferBranch", type: "string" },
                    { label: "TransferDate", property: "TransferDate", type: "Date", formatter: ".formatDate"},
                    { label: "Asset Value", property: "AssetValue", type: "number" },
                    { label: "Currency", property: "Currency", type: "string" },
                    { label: "Status", property: "Status", type: "string" },
                    { label: "TrashByEmployeeName", property: "TrashByEmployeeName", type: "string" },
                    { label: "TrashByEmployeeID", property: "TrashByEmployeeID", type: "string" },
                    { label: "Trash Date", property: "TrashDate", type: "Date", formatter: ".formatDate" },
                    { label: "Trash Comments", property: "TrashComments", type: "string"},

                     { label: "ReturnEmpName", property: "ReturnEmpName", type: "string" },
                    { label: "ReturnEmpID", property: "ReturnEmpID", type: "string" },
                    { label: "ReturnDate", property: "ReturnDate", type: "Date", formatter: ".formatDate" },
                    { label: "Return Comments", property: "Comments", type: "string"}
                ];

                const oSettings = {
                    workbook: {
                        columns: aCols,
                        context: {
                            sheetName: "Income Asset"
                        }
                    },
                    dataSource: oModelData,
                    fileName: "IncomeAsset.xlsx"
                };

                const oSheet = new Spreadsheet(oSettings);
                oSheet.build()
                    .then(function () {
                        MessageToast.show(that.i18nModel.getText("exportSuccessful"));                 })
                    
                    .finally(function () {
                        oSheet.destroy();
                    });
            }        });
    });




sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/Fragment",
    "../utils/validation",
], function (BaseController, JSONModel, MessageToast, MessageBox, BusyIndicator, Fragment, utils) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Subscription", {

        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteSubscription").attachMatched(this._onRouteMatched, this);
        },

        /* ROUTE MATCHED */
        _onRouteMatched: async function (oEvent) {
            this._showBusy();
            try {
                await this.commonLoginFunction("Booking");
                this.LoginModel = this.getView().getModel("LoginModel");

                this.sPath = oEvent.getParameter("arguments").sPath;

                // LEAVING THE "BROWSE PACKAGES" CONTEXT ENTIRELY -> CLEAR ANY STALE UPGRADE FLAG
                if (this.sPath === "ViewSubscrption") {
                    this._oSubscriptionToUpgrade = null;
                }

                // FLAG THE VIEW MODE FOR XML VISIBILITY BINDING
                this.getView().setModel(new JSONModel({
                    IsViewSubscription: this.sPath === "ViewSubscrption",
                    IsApplySubscription: this.sPath !== "ViewSubscrption",
                    IsUpgradeMode: this.sPath !== "ViewSubscrption" && !!this._oSubscriptionToUpgrade
                }), "PageModeModel");

                this.getView().setModel(new JSONModel({
                    items: [], count: 0, selectedTiers: { Basic: false, Silver: false, Gold: false, Platinum: false }
                }), "compareModel");

                // ALWAYS SET upgradeModel (EVEN EMPTY) SO XML BINDINGS DON'T BREAK
                this.getView().setModel(new JSONModel({
                    SubscriptionID: null,
                    OldPackageID: null,
                    OldPackageName: "",
                    OldAmount: 0,
                    RemainingDays: 0,
                    UnusedValue: 0
                }), "upgradeModel");

                if (this.sPath === "ViewSubscrption") {
                    await this._getCustomerSubscriptions();
                } else {
                    await this._getPackages();
                    if (this._oSubscriptionToUpgrade) {
                        this._buildUpgradeContext();
                    }
                }

            } catch (e) {
                this._hideBusy();
                MessageToast.show("Initialization failed");
            }
        },

        /* FETCH CUSTOMER'S OWN SUBSCRIPTIONS AND ENRICH WITH PACKAGE + STATUS INFO */
        _getCustomerSubscriptions: async function () {
            try {
                let filter = { UserID: this.LoginModel.getProperty("/UserID") };
                const oData = await this.ajaxReadWithJQuery("Subscription", filter);
                let aData = oData?.data || [];

                let oToday = new Date();
                oToday.setHours(0, 0, 0, 0);

                // FETCH ALL PACKAGES ONCE, MAP BY ID (avoids N+1 calls per subscription)
                const oPackageData = await this.ajaxReadWithJQuery("Package");
                let aPackages = oPackageData?.data || [];
                let oPackageMap = {};
                aPackages.forEach(function (p) { oPackageMap[p.PackageID] = p; });

                aData.forEach(function (oSub) {
                    let oPkg = oPackageMap[oSub.PackageID] || {};
                    oSub.PackageDisplayName = oPkg.PackageName || "Unknown Package";
                    oSub.FeaturesArray = (oPkg.Features && typeof oPkg.Features === "string") ? oPkg.Features.split(",") : [];

                    let oEndDate = new Date(oSub.EndDate);
                    oEndDate.setHours(0, 0, 0, 0);

                    oSub.IsCurrentlyActive = (oSub.SubscriptionStatus === "Active" && oEndDate >= oToday);
                    oSub.StatusText = oSub.IsCurrentlyActive ? "Active" : (oEndDate < oToday ? "Expired" : oSub.SubscriptionStatus);
                    oSub.StatusState = oSub.IsCurrentlyActive ? "Success" : (oEndDate < oToday ? "Error" : "Warning");

                    // DAYS REMAINING (only meaningful if active)
                    let iMsRemaining = oEndDate.getTime() - oToday.getTime();
                    oSub.DaysRemaining = Math.max(0, Math.ceil(iMsRemaining / (1000 * 60 * 60 * 24)));
                });

                var oJsonModel = new JSONModel(aData);
                this.getView().setModel(oJsonModel, "CustomerSubscriptionModel");

            } catch (err) {
                MessageToast.show(err.message || err.responseText || "Failed to load your subscriptions");
            } finally {
                this._hideBusy();
            }
        },

        /* BUSY INDICATOR HELPERS */
        _showBusy: function () {
            this.getBusyDialog();
        },

        _hideBusy: function () {
            this.closeBusyDialog();
        },

        /* NORMALIZE "Basic Package" -> "Basic", "Silver Package" -> "Silver", etc. */
        _normalizePackageTier: function (sPackageName) {
            if (!sPackageName) return "";
            return sPackageName.replace(/\s*Package\s*$/i, "").trim();
        },

        /* GET PACKAGES (ENRICHED WITH SUBSCRIBED/NOT-SUBSCRIBED TAGS) */
        _getPackages: async function () {
            this._showBusy();
            try {
                const [oPkgResponse, oSubResponse] = await Promise.all([
                    this.ajaxReadWithJQuery("Package"),
                    this.ajaxReadWithJQuery("Subscription", { UserID: this.LoginModel.getProperty("/UserID") })
                ]);

                var aPackages = oPkgResponse?.data || [];
                var aMySubs = oSubResponse?.data || [];

                var oToday = new Date();
                oToday.setHours(0, 0, 0, 0);

                // MAP: PackageID -> latest subscription record for that package
                var oMySubMap = {};
                aMySubs.forEach(function (oSub) {
                    oMySubMap[oSub.PackageID] = oSub;
                });

                aPackages.forEach(function (oItem) {
                    oItem.FeaturesArray =
                        (oItem.Features && typeof oItem.Features === "string") ? oItem.Features.split(",") : [];

                    var fOriginalPrice = Number(oItem.Price) || 0;
                    var fFinalPrice = fOriginalPrice;
                    var bHasDiscount = false;
                    var sDiscountLabel = "";

                    var bDiscountActive = false;
                    if (oItem.DiscountType && oItem.DiscountType !== "None" && Number(oItem.DiscountValue) > 0) {
                        var oFrom = oItem.DiscountValidFrom ? new Date(oItem.DiscountValidFrom) : null;
                        var oTo = oItem.DiscountValidTo ? new Date(oItem.DiscountValidTo) : null;
                        if (oFrom) oFrom.setHours(0, 0, 0, 0);
                        if (oTo) oTo.setHours(0, 0, 0, 0);

                        var bAfterFrom = !oFrom || oToday >= oFrom;
                        var bBeforeTo = !oTo || oToday <= oTo;
                        bDiscountActive = bAfterFrom && bBeforeTo;
                    }

                    if (bDiscountActive) {
                        bHasDiscount = true;
                        if (oItem.DiscountType === "Percentage") {
                            fFinalPrice = fOriginalPrice - (fOriginalPrice * Number(oItem.DiscountValue) / 100);
                            sDiscountLabel = Number(oItem.DiscountValue) + "% OFF";
                        } else if (oItem.DiscountType === "Flat") {
                            fFinalPrice = fOriginalPrice - Number(oItem.DiscountValue);
                            sDiscountLabel = "₹" + Number(oItem.DiscountValue) + " OFF";
                        }
                        fFinalPrice = fFinalPrice < 0 ? 0 : Math.round(fFinalPrice * 100) / 100;
                    }

                    oItem.OriginalPrice = fOriginalPrice;
                    oItem.FinalPrice = fFinalPrice;
                    oItem.HasDiscount = bHasDiscount;
                    oItem.DiscountLabel = sDiscountLabel;

                    oItem.IsTrialActive = (oItem.IsFreeTrialAvailable === 1 || oItem.IsFreeTrialAvailable === true)
                        && Number(oItem.FreeTrialDays) > 0;

                    // SUBSCRIBED / NOT SUBSCRIBED TAGGING
                    var oMySub = oMySubMap[oItem.PackageID];
                    if (oMySub) {
                        var oEndDate = new Date(oMySub.EndDate);
                        oEndDate.setHours(0, 0, 0, 0);
                        var bIsActive = (oMySub.SubscriptionStatus === "Active" && oEndDate >= oToday);

                        oItem.IsSubscribed = true;
                        oItem.IsSubscribedActive = bIsActive;
                        oItem.SubscribedTagText = bIsActive ? "Subscribed" : "Expired";
                        oItem.SubscribedTagState = bIsActive ? "Success" : "Error";
                    } else {
                        oItem.IsSubscribed = false;
                        oItem.IsSubscribedActive = false;
                        oItem.SubscribedTagText = "Not Subscribed";
                        oItem.SubscribedTagState = "None";
                    }
                });

                this.getView().setModel(new JSONModel(aPackages), "packageModel");

            } catch (e) {
                MessageToast.show("Failed to load packages");
            } finally {
                this._hideBusy();
            }
        },

        /* BUILD PRORATION DATA FROM THE SUBSCRIPTION BEING UPGRADED */
        _buildUpgradeContext: function () {
            let oOldSub = this._oSubscriptionToUpgrade;

            let oPackageModel = this.getView().getModel("packageModel");
            let aPackages = oPackageModel.getData() || [];
            let oOldPkg = aPackages.find(function (p) { return p.PackageID === oOldSub.PackageID; }) || {};

            let oToday = new Date();
            oToday.setHours(0, 0, 0, 0);
            let oEndDate = new Date(oOldSub.EndDate);
            oEndDate.setHours(0, 0, 0, 0);

            let iRemainingDays = Math.max(0, Math.ceil((oEndDate - oToday) / (1000 * 60 * 60 * 24)));

            // NOTE: assumes DurationDays comes from the Package master (oOldPkg.DurationDays).
            // If Subscription itself stores its own DurationDays, use oOldSub.DurationDays instead.
            let iOldDuration = Number(oOldPkg.DurationDays) || 1;
            let fOldAmount = Number(oOldSub.Amount) || 0;
            let fDailyRate = fOldAmount / iOldDuration;
            let fUnusedValue = Math.round(fDailyRate * iRemainingDays * 100) / 100;

            this.getView().getModel("upgradeModel").setData({
                SubscriptionID: oOldSub.SubscriptionID,
                OldPackageID: oOldSub.PackageID,
                OldPackageName: oOldPkg.PackageName || "Current Plan",
                OldAmount: fOldAmount,
                RemainingDays: iRemainingDays,
                UnusedValue: fUnusedValue
            });

            // REFLECT UPGRADE MODE IN PageModeModel NOW THAT WE HAVE CONTEXT
            this.getView().getModel("PageModeModel").setProperty("/IsUpgradeMode", true);
        },

        /* SUBSCRIBE BUTTON (BRANCHES TO UPGRADE FLOW WHEN APPLICABLE) */
        onSubscribe: function (oEvent) {
            var oData = oEvent.getSource().getBindingContext("packageModel").getObject();
            this.selectedPackage = oData;

            let bIsUpgrade = this.getView().getModel("PageModeModel").getProperty("/IsUpgradeMode");

            if (bIsUpgrade) {
                this._confirmUpgrade(oData);
            } else {
                this.onPayNow(oData);
            }
        },

        /* ===================== NORMAL (FIRST-TIME) SUBSCRIBE FLOW ===================== */

        /* CREATE SUBSCRIPTION + ORDER */
        onPayNow: async function (oPackage) {
            this._showBusy();
            try {
                let oStartDate = new Date();
                let oEndDate = new Date(new Date().getTime() + oPackage.DurationDays * 24 * 60 * 60 * 1000);

                let oPayload = {
                    data: {
                        PackageID: oPackage.PackageID,
                        UserID: this.LoginModel.getProperty("/UserID") || "",
                        UserName: this.LoginModel.getProperty("/UserName") || "",
                        StartDate: oStartDate.toISOString().split("T")[0],
                        EndDate: oEndDate.toISOString().split("T")[0],
                        Amount: oPackage.Price || 0,
                        SubscriptionStatus: "Pending",
                        PaymentStatus: "Pending"
                    }
                };

                const subResult = await this.ajaxCreateWithJQuery("Subscription", oPayload);

                if (!subResult.success) {
                    this._hideBusy();
                    return MessageToast.show("Subscription creation failed");
                }

                this.SubscriptionID = subResult.SubscriptionID;

                const orderResult = await this.ajaxCreateWithJQuery("create-order", {
                    amount: oPackage.Price
                });

                this._hideBusy();

                if (orderResult.success) {
                    this.openRazorpay(orderResult.data);
                }

            } catch (error) {
                this._hideBusy();
                MessageToast.show("Something went wrong");
            }
        },

        /* RAZORPAY PAYMENT (NEW SUBSCRIPTION) */
        openRazorpay: function (order) {
            const that = this;
            const options = {
                key: "rzp_test_SuMeTYlGdHxqOo",
                amount: order.amount,
                currency: order.currency,
                name: "StayVriksha",
                description: "Package Subscription",
                order_id: order.id,

                handler: async function (response) {
                    try {
                        that._showBusy();
                        const verifyResult = await that.ajaxCreateWithJQuery("verify-payment", response);
                        if (verifyResult.success) {
                            var PaymentPayload = {
                                data: {
                                    SubscriptionID: that.SubscriptionID,
                                    TransactionID: response.razorpay_payment_id,
                                    Amount: order.amount / 100,
                                    PaymentMethod: "UPI",
                                    PaymentGateway: "Razorpay",
                                    PaymentStatus: "Success",
                                    PaymentDate: new Date().toISOString().split("T")[0],
                                    GatewayResponse: JSON.stringify(response),
                                    LoginRole: (that.LoginModel.getProperty("/Subscription_Role") || "") + "," + (that.selectedPackage.RoleName || ""),
                                    UserID: that.LoginModel.getProperty("/UserID") || "",
                                    UserName: that.LoginModel.getProperty("/UserName") || ""
                                }
                            };
                            await that.ajaxCreateWithJQuery("SubscriptionPayment", PaymentPayload);
                            MessageToast.show("Subscription Activated Successfully");
                            that.getOwnerComponent().getRouter().navTo("TilePage");
                        } else {
                            MessageToast.show("Payment Verification Failed");
                        }
                    } catch (error) {
                        MessageToast.show("Payment Failed");
                    } finally {
                        that._hideBusy();
                    }
                },
                theme: {
                    color: "#673ab7"
                }
            };
            const rzp = new Razorpay(options);
            rzp.open();
        },

        /* ===================== UPGRADE FLOW ===================== */

        /* NAVIGATE FROM "MY SUBSCRIPTIONS" TO "AVAILABLE PACKAGES" (UPGRADE FLOW) */
        onUpgradeSubscription: function (oEvent) {
            let oContext = oEvent.getSource().getBindingContext("CustomerSubscriptionModel");
            this._oSubscriptionToUpgrade = oContext.getObject(); // holds SubscriptionID, PackageID, Amount, EndDate etc.

            this.getOwnerComponent().getRouter().navTo("RouteSubscription", {
                sPath: "ApplySubscription"
            });
        },

        /* SHOW CALCULATION BREAKDOWN BEFORE CHARGING */
        _confirmUpgrade: function (oPackage) {
            let oUpgrade = this.getView().getModel("upgradeModel").getData();
            let fNewPrice = Number(oPackage.FinalPrice) || 0;
            let fAmountPayable = Math.max(0, Math.round((fNewPrice - oUpgrade.UnusedValue) * 100) / 100);

            MessageBox.confirm(
                "Current Plan: " + oUpgrade.OldPackageName + "\n" +
                "Unused Credit (" + oUpgrade.RemainingDays + " days left): ₹" + oUpgrade.UnusedValue + "\n" +
                "New Plan: " + oPackage.PackageName + " (₹" + fNewPrice + ")\n" +
                "Amount Payable Now: ₹" + fAmountPayable,
                {
                    title: "Confirm Upgrade",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this.onUpgradePayNow(oPackage, fAmountPayable);
                        }
                    }.bind(this)
                }
            );
        },

        /* UPGRADE: CALCULATE PAYABLE AMOUNT, CHARGE (IF ANY), THEN UPDATE THE EXISTING ROW */
        onUpgradePayNow: async function (oPackage, fAmountPayable) {
            this._showBusy();
            try {
                let oUpgrade = this.getView().getModel("upgradeModel").getData();

                let oStartDate = new Date();
                let oEndDate = new Date(new Date().getTime() + oPackage.DurationDays * 24 * 60 * 60 * 1000);

                this.upgradePayload = {
                    SubscriptionID: oUpgrade.SubscriptionID,
                    PackageID: oPackage.PackageID,
                    StartDate: oStartDate.toISOString().split("T")[0],
                    EndDate: oEndDate.toISOString().split("T")[0],
                    Amount: fAmountPayable,
                    SubscriptionStatus: fAmountPayable > 0 ? "Pending" : "Active",
                    PaymentStatus: fAmountPayable > 0 ? "Pending" : "Success"
                };

                this._hideBusy();

                // FULLY COVERED BY EXISTING CREDIT — NO PAYMENT NEEDED, JUST UPDATE
                if (fAmountPayable <= 0) {
                    await this._finalizeUpgrade(this.upgradePayload, null);
                    MessageToast.show("Subscription upgraded successfully using existing credit");
                    this._oSubscriptionToUpgrade = null;
                    this.getOwnerComponent().getRouter().navTo("RouteSubscription", { sPath: "ViewSubscrption" });
                    return;
                }

                const orderResult = await this.ajaxCreateWithJQuery("create-order", { amount: fAmountPayable });
                if (orderResult.success) {
                    this.openUpgradeRazorpay(orderResult.data);
                }

            } catch (error) {
                this._hideBusy();
                MessageToast.show("Something went wrong during upgrade");
            }
        },

        /* RAZORPAY FOR UPGRADE PAYMENTS — ON SUCCESS, UPDATE INSTEAD OF CREATE */
        openUpgradeRazorpay: function (order) {
            const that = this;
            const options = {
                key: "rzp_test_SuMeTYlGdHxqOo",
                amount: order.amount,
                currency: order.currency,
                name: "StayVriksha",
                description: "Subscription Upgrade",
                order_id: order.id,

                handler: async function (response) {
                    try {
                        that._showBusy();
                        const verifyResult = await that.ajaxCreateWithJQuery("verify-payment", response);
                        if (verifyResult.success) {
                            await that._finalizeUpgrade(that.upgradePayload, response);
                            MessageToast.show("Subscription Upgraded Successfully");
                            that._oSubscriptionToUpgrade = null;
                            that.getOwnerComponent().getRouter().navTo("RouteSubscription", { sPath: "ViewSubscrption" });
                        } else {
                            MessageToast.show("Payment Verification Failed");
                        }
                    } catch (error) {
                        debugger;
                        MessageToast.show("Upgrade Failed");
                    } finally {
                        that._hideBusy();
                    }
                },
                theme: { color: "#673ab7" }
            };
            const rzp = new Razorpay(options);
            rzp.open();
        },

        /* UPDATE THE EXISTING SUBSCRIPTION ROW (NOT A NEW ONE) + LOG PAYMENT */
        _finalizeUpgrade: async function (oPayload, oPaymentResponse) {

            var oBody = {
                data: {
                    PackageID: oPayload.PackageID,
                    StartDate: oPayload.StartDate,
                    EndDate: oPayload.EndDate,
                    Amount: oPayload.Amount,
                    SubscriptionStatus: oPayload.SubscriptionStatus,
                    PaymentStatus: oPayload.PaymentStatus
                },
                filters: {
                    SubscriptionID: oPayload.SubscriptionID
                }
            };

            await this.ajaxUpdateWithJQuery("Subscription", oBody);

            if (oPaymentResponse) {
                var oPaymentPayload = {
                    data: {
                        SubscriptionID: oPayload.SubscriptionID,
                        TransactionID: oPaymentResponse.razorpay_payment_id,
                        Amount: oPayload.Amount,
                        PaymentMethod: "UPI",
                        PaymentGateway: "Razorpay",
                        PaymentStatus: "Success",
                        PaymentDate: new Date().toISOString().split("T")[0],
                        GatewayResponse: JSON.stringify(oPaymentResponse),
                        LoginRole: (this.LoginModel.getProperty("/Subscription_Role") || "") + "," + (this.selectedPackage.RoleName || ""),
                        UserID: this.LoginModel.getProperty("/UserID") || "",
                        UserName: this.LoginModel.getProperty("/UserName") || ""
                    }
                };
                await this.ajaxCreateWithJQuery("SubscriptionPayment", oPaymentPayload);
            }
        },

        /* ===================== ADD PACKAGE (ADMIN) ===================== */

        ClearModel: function () {
            var oCreateModel = new JSONModel({ PackageName: "", Description: "", Price: "", DurationDays: "", Features: "", IsActive: true, RoleName: "" });
            this.getView().setModel(oCreateModel, "createPackageModel");
        },

        onAddPackage: async function () {
            this.ClearModel();
            if (!this.oPackageDialog) {
                this.oPackageDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.ui.com.project1.fragment.AddPackage",
                    controller: this
                });
                this.getView().addDependent(this.oPackageDialog);
            }
            this.oPackageDialog.open();
        },

        ClearModel: function () {
            var oCreateModel = new JSONModel({
                PackageName: "",
                Description: "",
                Price: "",
                DurationDays: "",
                Features: "",
                IsActive: true,
                RoleName: "",
                IsFreeTrialAvailable: false,
                FreeTrialDays: "",
                DiscountType: "None",
                DiscountValue: "",
                DiscountValidFrom: null,
                DiscountValidTo: null
            });

            this.getView().setModel(oCreateModel, "createPackageModel");
        },

        onCreatePackage: function () {
            var oView = this.getView();
            var oModel = oView.getModel("createPackageModel");
            var oData = oModel.getData() || {};

            // Use Fragment.byId if IDs were prefixed by view ID, fallback to this.byId
            var fnGetControl = function (sId) {
                return sap.ui.core.Fragment.byId(oView.getId(), sId) || this.byId(sId);
            }.bind(this);

            var oPackageName = fnGetControl("idPackageName");
            var oDescription = fnGetControl("idDescription");
            var oPrice = fnGetControl("idPrice");
            var oDurationDays = fnGetControl("idDurationDays");
            var oFeatures = fnGetControl("idFeatures");
            var oRoleName = fnGetControl("idRoleName");
            var oFreeTrialDays = fnGetControl("idFreeTrialDays");
            var oDiscountValue = fnGetControl("idDiscountValue");
            var oDiscountValidFrom = fnGetControl("idDiscountValidFrom");
            var oDiscountValidTo = fnGetControl("idDiscountValidTo");

            var aControls = [
                oPackageName, oDescription, oPrice, oDurationDays, oFeatures,
                oRoleName, oFreeTrialDays, oDiscountValue, oDiscountValidFrom, oDiscountValidTo
            ];

            // Reset previous validation states safely
            aControls.forEach(function (oCtrl) {
                if (oCtrl && typeof oCtrl.setValueState === "function") {
                    oCtrl.setValueState("None");
                    oCtrl.setValueStateText("");
                }
            });

            var bValid = true;

            // 1. Package Name
            if (!oData.PackageName || !oData.PackageName.trim()) {
                if (oPackageName) {
                    oPackageName.setValueState("Error");
                    oPackageName.setValueStateText("Package Name is required");
                }
                bValid = false;
            }

            // 2. Description
            if (!oData.Description || !oData.Description.trim()) {
                if (oDescription) {
                    oDescription.setValueState("Error");
                    oDescription.setValueStateText("Description is required");
                }
                bValid = false;
            }

            // 3. Price
            if (oData.Price === "" || oData.Price === null || oData.Price === undefined) {
                if (oPrice) {
                    oPrice.setValueState("Error");
                    oPrice.setValueStateText("Price is required");
                }
                bValid = false;
            } else if (isNaN(oData.Price) || Number(oData.Price) <= 0) {
                if (oPrice) {
                    oPrice.setValueState("Error");
                    oPrice.setValueStateText("Price must be a positive number");
                }
                bValid = false;
            }

            // 4. Duration Days
            if (oData.DurationDays === "" || oData.DurationDays === null || oData.DurationDays === undefined) {
                if (oDurationDays) {
                    oDurationDays.setValueState("Error");
                    oDurationDays.setValueStateText("Duration Days is required");
                }
                bValid = false;
            } else if (isNaN(oData.DurationDays) || Number(oData.DurationDays) <= 0 || !Number.isInteger(Number(oData.DurationDays))) {
                if (oDurationDays) {
                    oDurationDays.setValueState("Error");
                    oDurationDays.setValueStateText("Duration Days must be a positive whole number");
                }
                bValid = false;
            }

            // 5. Features
            if (!oData.Features || !oData.Features.trim()) {
                if (oFeatures) {
                    oFeatures.setValueState("Error");
                    oFeatures.setValueStateText("At least one Feature is required");
                }
                bValid = false;
            }

            // 6. Role Name
            if (!oData.RoleName || !oData.RoleName.trim()) {
                if (oRoleName) {
                    oRoleName.setValueState("Error");
                    oRoleName.setValueStateText("Role Name is required");
                }
                bValid = false;
            }

            // 7. Free Trial Validation
            if (oData.IsFreeTrialAvailable) {
                if (oData.FreeTrialDays === "" || oData.FreeTrialDays === null || oData.FreeTrialDays === undefined) {
                    if (oFreeTrialDays) {
                        oFreeTrialDays.setValueState("Error");
                        oFreeTrialDays.setValueStateText("Free Trial Days is required when trial is enabled");
                    }
                    bValid = false;
                } else if (isNaN(oData.FreeTrialDays) || Number(oData.FreeTrialDays) <= 0 || !Number.isInteger(Number(oData.FreeTrialDays))) {
                    if (oFreeTrialDays) {
                        oFreeTrialDays.setValueState("Error");
                        oFreeTrialDays.setValueStateText("Free Trial Days must be a positive whole number");
                    }
                    bValid = false;
                }
            }

            // 8. Discount Validation
            if (oData.DiscountType && oData.DiscountType !== "None") {
                // Discount Value
                if (oData.DiscountValue === "" || oData.DiscountValue === null || oData.DiscountValue === undefined || Number(oData.DiscountValue) <= 0) {
                    if (oDiscountValue) {
                        oDiscountValue.setValueState("Error");
                        oDiscountValue.setValueStateText("Discount Value must be a positive number");
                    }
                    bValid = false;
                } else if (oData.DiscountType === "Percentage" && Number(oData.DiscountValue) > 100) {
                    if (oDiscountValue) {
                        oDiscountValue.setValueState("Error");
                        oDiscountValue.setValueStateText("Percentage discount cannot exceed 100");
                    }
                    bValid = false;
                } else if (oData.DiscountType === "Flat" && Number(oData.DiscountValue) >= Number(oData.Price)) {
                    if (oDiscountValue) {
                        oDiscountValue.setValueState("Error");
                        oDiscountValue.setValueStateText("Flat discount cannot be greater than or equal to Price");
                    }
                    bValid = false;
                }

                // Discount Valid From (Required check added)
                if (!oData.DiscountValidFrom) {
                    if (oDiscountValidFrom) {
                        oDiscountValidFrom.setValueState("Error");
                        oDiscountValidFrom.setValueStateText("Valid From date is required");
                    }
                    bValid = false;
                }

                // Discount Valid To (Required check added)
                if (!oData.DiscountValidTo) {
                    if (oDiscountValidTo) {
                        oDiscountValidTo.setValueState("Error");
                        oDiscountValidTo.setValueStateText("Valid To date is required");
                    }
                    bValid = false;
                }

                // Date Range Validation
                if (oData.DiscountValidFrom && oData.DiscountValidTo) {
                    var oFrom = new Date(oData.DiscountValidFrom);
                    var oTo = new Date(oData.DiscountValidTo);

                    if (isNaN(oFrom.getTime())) {
                        if (oDiscountValidFrom) {
                            oDiscountValidFrom.setValueState("Error");
                            oDiscountValidFrom.setValueStateText("Invalid From Date format");
                        }
                        bValid = false;
                    }

                    if (isNaN(oTo.getTime())) {
                        if (oDiscountValidTo) {
                            oDiscountValidTo.setValueState("Error");
                            oDiscountValidTo.setValueStateText("Invalid To Date format");
                        }
                        bValid = false;
                    }

                    if (!isNaN(oFrom.getTime()) && !isNaN(oTo.getTime()) && oTo < oFrom) {
                        if (oDiscountValidTo) {
                            oDiscountValidTo.setValueState("Error");
                            oDiscountValidTo.setValueStateText("Valid To date cannot be before Valid From date");
                        }
                        bValid = false;
                    }
                }
            }

            if (!bValid) {
                sap.m.MessageToast.show("Please fix the errors before submitting.");
                return;
            }

            // ===== BUILD PAYLOAD MATCHING TABLE STRUCTURE =====
            var oPayload = {
                PackageName: oData.PackageName.trim(),
                Description: oData.Description.trim(),
                Price: Number(oData.Price),
                DurationDays: Number(oData.DurationDays),
                Features: oData.Features.trim(),
                IsActive: oData.IsActive ? 1 : 0,
                IsFreeTrialAvailable: oData.IsFreeTrialAvailable ? 1 : 0,
                FreeTrialDays: oData.IsFreeTrialAvailable ? Number(oData.FreeTrialDays) : 0,
                DiscountType: oData.DiscountType || "None",
                DiscountValue: (oData.DiscountType && oData.DiscountType !== "None") ? Number(oData.DiscountValue) : 0,
                DiscountValidFrom: (oData.DiscountType && oData.DiscountType !== "None" && oData.DiscountValidFrom)
                    ? this._formatDateForDb(oData.DiscountValidFrom) : null,
                DiscountValidTo: (oData.DiscountType && oData.DiscountType !== "None" && oData.DiscountValidTo)
                    ? this._formatDateForDb(oData.DiscountValidTo) : null,
                CreatedBy: "Admin",
                RoleName: oData.RoleName.trim()
            };

            if (typeof this.getBusyDialog === "function") {
                this.getBusyDialog();
            }

            this.getOwnerComponent().getModel().create("/Package", oPayload, {
                success: function () {
                    sap.m.MessageToast.show("Package Created Successfully");
                    if (this.oPackageDialog) {
                        this.oPackageDialog.close();
                    }
                    if (typeof this.SubscriptionReadCall === "function") {
                        this.SubscriptionReadCall();
                    }
                    if (typeof this.ClearModel === "function") {
                        this.ClearModel();
                    }
                    if (typeof this.closeBusyDialog === "function") {
                        this.closeBusyDialog();
                    }
                }.bind(this),

                error: function () {
                    if (typeof this.closeBusyDialog === "function") {
                        this.closeBusyDialog();
                    }
                    sap.m.MessageToast.show("Failed to Create Package");
                }.bind(this)
            });
        },
        /* FORMAT A JS Date OR DatePicker STRING TO 'YYYY-MM-DD' FOR THE DB */
        _formatDateForDb: function (vDate) {
            if (!vDate) return null;
            var oDate = (vDate instanceof Date) ? vDate : new Date(vDate);
            if (isNaN(oDate.getTime())) return null;
            return oDate.toISOString().split("T")[0];
        },

        //    NAVIGATION
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("TilePage");
        },

        onHome: function () {
            this.CommonLogoutFunction();
        },

        onClosePackageDialog: function (oEvent) {
            this.oPackageDialog.close();
        },

        onPackageNameInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        /* ===================== COMPARE FEATURE ===================== */

        /* TOGGLE ADD/REMOVE PACKAGE TO COMPARE LIST */
        onAddToCompare: function (oEvent) {
            let oContext = oEvent.getSource().getBindingContext("packageModel");
            let oPackage = oContext.getObject();
            let sTier = this._normalizePackageTier(oPackage.PackageName);

            let oCompareModel = this.getView().getModel("compareModel");
            let aItems = oCompareModel.getProperty("/items");

            let iIndex = aItems.findIndex(function (o) { return o.PackageID === oPackage.PackageID; });

            if (iIndex > -1) {
                aItems.splice(iIndex, 1);
                oCompareModel.setProperty("/selectedTiers/" + sTier, false);
            } else {
                if (aItems.length >= 4) {
                    MessageToast.show("You can compare up to 4 packages only.");
                    return;
                }
                aItems.push({ PackageID: oPackage.PackageID, PackageName: oPackage.PackageName, Tier: sTier });
                oCompareModel.setProperty("/selectedTiers/" + sTier, true);
            }

            oCompareModel.setProperty("/items", aItems);
            oCompareModel.setProperty("/count", aItems.length);
        },

        /* FORMATTER: button label reflects whether this package is already in the compare list */
        getCompareButtonText: function (sPackageID, aItems) {
            aItems = aItems || [];
            let bFound = aItems.some(function (o) { return o.PackageID === sPackageID; });
            return bFound ? "Remove from Compare" : "Add to Compare";
        },

        onCloseCompareDialog: function () {
            this.oCompareDialog.close();
        },

        onOpenCompareDialog: async function () {
            try {
                this._showBusy();

                let oCompareModel = this.getView().getModel("compareModel");
                let aSelectedItems = oCompareModel.getProperty("/items");

                let oPackageModel = this.getView().getModel("packageModel");
                let aAllPackages = oPackageModel.getData() || [];

                if (!aSelectedItems.length) {
                    MessageToast.show("Please select at least one package to compare.");
                    return;
                }

                const oData = await this.ajaxReadWithJQuery("Package_Feature_Comparison");
                let aFeatures = oData?.data || [];

                let aRows = aFeatures.map(function (oFeature) {
                    return {
                        Application: oFeature.Application,
                        Basic: oFeature.Basic,
                        Silver: oFeature.Silver,
                        Gold: oFeature.Gold,
                        Platinum: oFeature.Platinum
                    };
                });

                // BUILD FULL LIST WITH Checked FLAG DERIVED FROM compareModel/items
                let aAllForDialog = aAllPackages.map(function (oPkg) {
                    let bChecked = aSelectedItems.some(function (o) { return o.PackageID === oPkg.PackageID; });
                    return {
                        PackageID: oPkg.PackageID,
                        PackageName: oPkg.PackageName,
                        Tier: this._normalizePackageTier(oPkg.PackageName),
                        Checked: bChecked
                    };
                }.bind(this));

                this.getView().setModel(new JSONModel({
                    rows: aRows,
                    allPackages: aAllForDialog,
                    selectedTiers: oCompareModel.getProperty("/selectedTiers")
                }), "comparisonModel");

                if (!this.oCompareDialog) {
                    this.oCompareDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "sap.ui.com.project1.fragment.CompareDialog",
                        controller: this
                    });
                    this.getView().addDependent(this.oCompareDialog);
                }
                this.oCompareDialog.open();

            } catch (err) {
                MessageToast.show(err.message || err.responseText || "Failed to load comparison");
            } finally {
                this._hideBusy();
            }
        },

        /* CHECKBOX TOGGLE — keeps compareModel, comparisonModel, and the floating button count in sync */
        onToggleComparePackage: function (oEvent) {
            let bChecked = oEvent.getParameter("selected");
            let oContext = oEvent.getSource().getBindingContext("comparisonModel");
            let oPkg = oContext.getObject();

            let oComparisonModel = this.getView().getModel("comparisonModel");
            oComparisonModel.setProperty(oContext.getPath() + "/Checked", bChecked);

            let oCompareModel = this.getView().getModel("compareModel");
            let aItems = oCompareModel.getProperty("/items");
            let iIndex = aItems.findIndex(function (o) { return o.PackageID === oPkg.PackageID; });

            if (bChecked) {
                if (iIndex === -1) {
                    if (aItems.length >= 4) {
                        MessageToast.show("You can compare up to 4 packages only.");
                        oComparisonModel.setProperty(oContext.getPath() + "/Checked", false);
                        return;
                    }
                    aItems.push({ PackageID: oPkg.PackageID, PackageName: oPkg.PackageName, Tier: oPkg.Tier });
                    oCompareModel.setProperty("/selectedTiers/" + oPkg.Tier, true);
                }
            } else {
                if (iIndex > -1) {
                    aItems.splice(iIndex, 1);
                    oCompareModel.setProperty("/selectedTiers/" + oPkg.Tier, false);
                }
            }

            oCompareModel.setProperty("/items", aItems);
            oCompareModel.setProperty("/count", aItems.length);

            oComparisonModel.setProperty("/selectedTiers", oCompareModel.getProperty("/selectedTiers"));

            if (!aItems.length) {
                this.oCompareDialog.close();
            }
        }

    });
});
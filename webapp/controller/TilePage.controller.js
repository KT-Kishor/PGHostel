sap.ui.define([
    "./BaseController", //call base controller 
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
     "../utils/validation",
], function (BaseController, JSONModel, MessageToast,utils) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.TilePage", {
        onInit: function () {
            this._initGuideStateModel();
            this.getOwnerComponent().getRouter().getRoute("TilePage").attachMatched(this._onRouteMatched, this);
        },

        _initGuideStateModel: function () {
            if (!this.getView().getModel("tilePageView")) {
                this.getView().setModel(new JSONModel({
                    isStepsGuideVisible: true
                }), "tilePageView");
            }
            this._bStartingTileGuide = false;
        },

        _setStepsGuideButtonVisible: function (bVisible) {
            var oModel = this.getView().getModel("tilePageView");
            if (oModel) {
                oModel.setProperty("/isStepsGuideVisible", bVisible);
            }
        },

        _handleRoleGuideAfterClose: function () {
            if (this._bStartingTileGuide) {
                this._bStartingTileGuide = false;
                return;
            }
            this._setStepsGuideButtonVisible(true);
        },

        _onRouteMatched: function () {
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
             this.getView().setModel(
                new JSONModel({
                    tokens: []
                }),
                "tokenModel"
            );
             const oUploaderData = new JSONModel({
                attachments: []
            });
            this.getView().setModel(oUploaderData, "UploaderData");
             var model = new JSONModel({
                AppName: "",
                BugDescription: "",
                RaisedBy: "",
                Email: ""
            });
            this.getView().setModel(model, "RaiseBugModel")
            this.AppVisibilityReadCall();
        },

        AppVisibilityReadCall: async function () {
            try {
                this.getBusyDialog()
                this.commonLoginFunction("TilePage");
                const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
                let filter = { Role: oLoginModel.getProperty("/Role") }
                const oData = await this.ajaxReadWithJQuery("HM_AppVisibility", filter);
                var oModel = new JSONModel(oData.data[0]);
                this.getOwnerComponent().setModel(oModel, "TileVisibility");
            } catch (err) {
                this.closeBusyDialog()
                MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog()
            }
        },

        TileV_onpressInbox: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteAdmin",{
                sPath:"TilePage"
            });
        },

        Tile_onLogPress: function () {
            this.CommonLogoutFunction();
        },

        TileV_onpressroomdetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteRoomDetails");
        },

        TileV_onpressbeddetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBedDetails",{
                sPath:"Tile Page"
            });
        },

        TileV_onpressextrafacilities: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitis", { 
                value: "Facilities",
                sPath: "TilePage"
               });
        },

        TileV_onpressBedImages: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteRoomImages");
        },

        TileV_onpressfacilities: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitiesDetails");
        },

        TileV_onpressmaintaindata: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteMaintainData");
        },

        TileV_onpressBranchdata: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBranchData");
        },

        TileV_onpresshostelfeatures: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostelFeatures");
        },

        TileV_onpressManageInvoice: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageInvoice",{
                sPath:"TilePage"
            });
        },

        TileV_onpressCouponDetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteCouponDetails");
        },

        TileV_onpressManageStaff: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageStaff");
        },

        TileV_onpressManageVendor: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageVendor",{
                sPath:"TilePage"
            });
        },

        TileV_onpressPayment: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RoutePayment");
        },

        TileV_onpressDeposit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDeposit");
        },

        TileV_onpressdashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDashboard");
        },

        TileV_onpresshosteldashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostelDashboard");
        },

        TileV_onpresscustomerreview: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteCustomerReview");
        },

        TileV_onpresscomplaintdashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteComplainDashboard", {
                sPath: "Dashboard"
            });
        },
        TileV_onpressComplaintdetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteComplaintDetails");
        },

        TileV_onpressdamage: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDamage",{
                sPath:"TilePage"
            });
        },

        TileV_onpressdamagedashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDamageDashboard");
        },
          TileV_onpressSupportVendor: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteSupportDetails");
        },
          TileV_onpressBugRaiseVendor: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBugDetails");
        },
          TileV_onpressManageAds: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageAds");
        },

        // onStartGuide: function () {
        //     if (!this._oGuideDialog) {
        //         this._oGuideDialog = new sap.m.Dialog({
        //             title: "Steps to Know",
        //             contentWidth: "60vw",
        //             contentHeight: "36.8vw",
        //             resizable: true,
        //             draggable: true,
        //             verticalScrolling: false,
        //             horizontalScrolling: false,
        //             content: [
        //                 new sap.m.Image({
        //                     src: "image/Guide.jpg",
        //                     width: "100%",
        //                     height: "100%",
        //                     decorative: false,
        //                     densityAware: false
        //                 }).addStyleClass("PG-fitImage") 
        //             ],
        //             endButton: new sap.m.Button({
        //                 text: "Close",
        //                 press: function () {
        //                     this._oGuideDialog.close();
        //                 }.bind(this)
        //             }).addStyleClass("myUnifiedBtn")
        //         }).addStyleClass("barheader PG-noPaddingDialog"); 
        //         this.getView().addDependent(this._oGuideDialog);
        //     }
        //     this._oGuideDialog.open();
        // },

        Tile_onHomePress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },

        // ─── ROLE ACCESS CONFIG ────────────────────────────────────────────────────
        // Maps each role to its guide metadata
        _getRoleGuideConfig: function (sRole) {
            var oRoleMap = {
                "SuperAdmin": {
                    roleLabel: "Super Admin",
                    accessLevel: "Full Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://shield",
                    summary: "Unrestricted access to manage all Branches, Staffs, Vendors, Finances, and System-wide configurations.",
                    accessItems: [
                        {
                            icon: "sap-icon://building",
                            color: "#008b96",
                            label: "Infrastructure",
                            detail: "Manage Branches, Rooms, Beds, Facilities and Amenities"
                        },
                        {
                            icon: "sap-icon://customer",
                            color: "#008b96",
                            label: "Operations",
                            detail: "Full control over Bookings, Invoices, Deposits & Coupons"
                        },
                        {
                            icon: "sap-icon://group",
                            color: "#008b96",
                            label: "User Management",
                            detail: "Administer Staff members, Vendors and Customer Support requests"
                        },
                        {
                            icon: "sap-icon://feedback",
                            color: "#008b96",
                            label: "Feedback & Issues",
                            detail: "Monitor Complaints, Damages and Reviews"
                        },
                        {
                            icon: "sap-icon://business-objects-experience",
                            color: "#008b96",
                            label: "Analytics",
                            detail: "Real-time insights across all Dashboards"
                        }
                    ]
                },
                "Admin": {
                    roleLabel: "Branch Admin",
                    accessLevel: "Branch-Wide Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://building",
                    summary: "Unrestricted access to manage all Branches, Staff, Finances, and System-wide configurations",
                    accessItems: [
                        {
                            icon: "sap-icon://building",
                            color: "#008b96",
                            label: "Infrastructure",
                            detail: "Manage Branches, Rooms, Beds, Facilities and Amenities"
                        },
                        {
                            icon: "sap-icon://customer",
                            color: "#008b96",
                            label: "Operations",
                            detail: "Full control over Bookings, Invoices, Deposits & Coupons"
                        },
                        {
                            icon: "sap-icon://group",
                            color: "#008b96",
                            label: "User Management",
                            detail: "Administer Staff members and Customer Support requests"
                        },
                        {
                            icon: "sap-icon://feedback",
                            color: "#008b96",
                            label: "Feedback & Issues",
                            detail: "Monitor Complaints, Damages and Reviews"
                        },
                        {
                            icon: "sap-icon://business-objects-experience",
                            color: "#008b96",
                            label: "Analytics",
                            detail: "Real-time insights across all Dashboards"
                        }
                    ]
                },
                "Branch Manager": {
                    roleLabel: "Branch Manager",
                    accessLevel: "Branch-Scoped Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://manager",
                    summary: "Unrestricted access to all operations specific to your allocated Branch — Staff, Finances, and System-wide configurations",
                    accessItems: [
                        {
                            icon: "sap-icon://building",
                            color: "#008b96",
                            label: "Infrastructure",
                            detail: "Manage Rooms, Beds, Facilities and Amenities"
                        },
                        {
                            icon: "sap-icon://customer",
                            color: "#008b96",
                            label: "Operations",
                            detail: "Full control over Bookings, Invoices, Deposits & Coupons"
                        },
                        {
                            icon: "sap-icon://group",
                            color: "#008b96",
                            label: "User Management",
                            detail: "Administer Staff members and Customer Support requests"
                        },
                        {
                            icon: "sap-icon://feedback",
                            color: "#008b96",
                            label: "Feedback & Issues",
                            detail: "Monitor Complaints, Damages and Reviews"
                        },
                        {
                            icon: "sap-icon://business-objects-experience",
                            color: "#008b96",
                            label: "Analytics",
                            detail: "Real-time insights across all Dashboards"
                        }
                    ]
                },
                "Front Office Employee": {
                    roleLabel: "Front Office Employee",
                    accessLevel: "Mixed Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://retail-store",


                    summary: "As a Front Office Employee, you have full access to customer-facing operations (bookings, invoices, complaints) and view-only access to branch-level data.",
                    accessItems: [
                        { icon: "sap-icon://customer", color: "#008b96", label: "Full: Customers & Invoices", detail: "Manage customers, invoices, payments and deposits." },
                        { icon: "sap-icon://display", color: "#e9730c", label: "View Only: Config Data", detail: "Branch, Bed, Room, Facilities, Amenities and coupons are read-only." },

                    ]
                },
                "Housekeeping": {
                    roleLabel: "House Keeping",
                    accessLevel: "Limited Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://customer-view",
                    summary: "As a Housekeeping staff member, your access is restricted to Complaint & Complaint Dashbaord",
                    accessItems: [
                        { icon: "sap-icon://customer-view", color: "#008b96", label: "View: Complaint Details", detail: "Read-only access to complaint details" },
                        { icon: "sap-icon://alert", color: "#008b96", label: "View: Complaint Dashboard", detail: "Read-only access to complaint dashboard." },
                    ]
                },
                "ManageVendor": {
                    roleLabel: "Vendor Manager",
                    accessLevel: "Vendor-Only Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://supplier",
                    summary: "As a Vendor Manager, you have access to vendor management and customer support requests. All hostel operations, customer data, and dashboards are outside your scope.",
                    accessItems: [
                        { icon: "sap-icon://supplier", color: "#008b96", label: "Vendor Management", detail: "Full access to create and manage  vendors" },
                        { icon: "sap-icon://customer", color: "#008b96", label: "Customer Support", detail: "Review and manage customer support requests." },
               
                    ]
                }
            };

            return oRoleMap[sRole] || {
                roleLabel: sRole || "User",
                accessLevel: "Custom Access",
                accessState: "None",
                accessIcon: "sap-icon://person-placeholder",
                summary: "Your access is configured by your system administrator. Use the tour below to explore available modules.",
                accessItems: [
                    { icon: "sap-icon://information", color: "#008b96", label: "Contact Admin", detail: "Reach out to your Super Admin for access queries." }
                ]
            };
        },

        // ─── STEP 1: Show the role overview popover ────────────────────────────────
        onStartGuide: function () {
            var oView = this.getView();
            var oComponent = this.getOwnerComponent();
            var oVisibilityModel = oComponent.getModel("TileVisibility");
            var oLoginModel = oComponent.getModel("LoginModel");

            if (!oVisibilityModel || !oVisibilityModel.getData()) {
                sap.m.MessageToast.show("Please wait, checking permissions...");
                return;
            }

            var sRole = oLoginModel ? oLoginModel.getProperty("/Role") : "";
            var oConfig = this._getRoleGuideConfig(sRole);
            this._setStepsGuideButtonVisible(false);
            this._bStartingTileGuide = false;

            if (!this._oRoleGuideModel) {
                this._oRoleGuideModel = new sap.ui.model.json.JSONModel();
                oComponent.setModel(this._oRoleGuideModel, "roleGuideModel");
            }
            this._oRoleGuideModel.setData(oConfig);

            // Pre-build tile steps so they're ready when tour starts
            this._buildTileSteps();

            var that = this;
            if (!this._oRoleGuideDialog) {
                this.loadFragment({
                    name: "sap.ui.com.project1.fragment.RoleGuidePopover"  // keep same file name
                }).then(function (oDialog) {
                    that._oRoleGuideDialog = oDialog;
                    oDialog.setModel(that._oRoleGuideModel, "roleGuideModel");
                    oDialog.attachAfterClose(that._handleRoleGuideAfterClose, that);
                    oView.addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oRoleGuideDialog.setModel(this._oRoleGuideModel, "roleGuideModel");
                this._oRoleGuideDialog.open();
            }
        },

        // ─── STEP 1 helpers ────────────────────────────────────────────────────────
        onBeforeRolePopoverClose: function (oEvent) {
            // Allow it to close freely (unlike the tour popover, this one can be dismissed)
        },

        onSkipRoleGuide: function () {
            if (this._oRoleGuideDialog && this._oRoleGuideDialog.isOpen()) {
                this._oRoleGuideDialog.close();
            } else {
                this._setStepsGuideButtonVisible(true);
            }
        },

        // ─── STEP 2: "Start Tour" pressed — close role popover, begin tile tour ───
        onStartTileGuide: function () {
            var that = this;
            this._bStartingTileGuide = true;
            if (this._oRoleGuideDialog && this._oRoleGuideDialog.isOpen()) {
                this._oRoleGuideDialog.attachEventOnce("afterClose", function () {
                    that._launchTileSteps();
                });
                this._oRoleGuideDialog.close();
            } else {
                this._launchTileSteps();
            }
        },

        _buildTileSteps: function () {
            var oView = this.getView();
            var oComponent = this.getOwnerComponent();
            var oI18nModel = oComponent.getModel("i18n");
            var oLoginModel = oComponent.getModel("LoginModel");
            var oBundle = oI18nModel ? oI18nModel.getResourceBundle() : null;
            var sRole = oLoginModel ? oLoginModel.getProperty("/Role") : "";

            // ── Master tile config ─────────────────────────────────────────────────
            // descKey      = default full-access i18n key
            // descKey_view = read-only variant key (used when role has view-only access)
            // viewOnlyRoles = roles that get the _view variant for this tile
            var aTileConfig = [
                // ── Category 1: Setup & Configuration ────────────────────────────
                {
                    id: "branchTile",
                    headerKey: "manageBranchDetails",
                    descKey: "tour_desc_branch",
                    descKey_view: "tour_desc_branch_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "bedTile",
                    headerKey: "manageBedDetails",
                    descKey: "tour_desc_bed",
                    descKey_view: "tour_desc_bed_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "roomTile",
                    headerKey: "tileManageRoomDetails",
                    descKey: "tour_desc_room",
                    descKey_view: "tour_desc_room_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "customerTile",
                    headerKey: "manageExtraFacilities",
                    descKey: "tour_desc_facilities",
                    descKey_view: "tour_desc_facilities_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "id1roomTile",
                    headerKey: "maintainHostelFeatures",
                    descKey: "tour_desc_hostelFeatures",
                    descKey_view: "tour_desc_hostelFeatures_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "id2roomTile",
                    headerKey: "manageCouponDetails",
                    descKey: "tour_desc_coupon",
                    descKey_view: "tour_desc_coupon_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "id5roomTile",
                    headerKey: "manageStaff",
                    descKey: "tour_desc_staff"
                    // No viewOnlyRoles — staff tile is fully hidden for Front OfficeEmployee (not shown)
                },
                {
                    id: "id6roomTile",
                    headerKey: "manageVendors",
                    descKey: "tour_desc_vendor"
                    // ManageVendor role sees only this tile — full access
                },

                {
                    id: "idSupportTile",
                    headerKey: "supportVendor",
                    descKey: "tour_desc_support"
                },
                // ── Category 2: Operations ────────────────────────────────────────
                {
                    id: "id3roomTile",
                    headerKey: "manageCustomerDetails",
                    descKey: "tour_desc_customer"
                    // Full access for all roles that can see it
                },
                {
                    id: "id4roomTile",
                    headerKey: "invoiceDetails",
                    descKey: "tour_desc_invoice"
                },
                {
                    id: "id8roomTile",
                    headerKey: "returnDeposit",
                    descKey: "tour_desc_deposit"
                },
                {
                    id: "id7roomTile",
                    headerKey: "payment",
                    descKey: "tour_desc_payment"
                },
                {
                    id: "TP_DamageTile",
                    headerKey: "damageTracking",
                    descKey: "tour_desc_damage"
                },
                {
                    id: "id12roomTile",
                    headerKey: "Complaintdetails",
                    descKey: "tour_desc_complaint",
                    descKey_view: "tour_desc_complaint_view",
                    viewOnlyRoles: ["Housekeeping"]
                },
                {
                    id: "id11roomTile",
                    headerKey: "customerReview",
                    descKey: "tour_desc_customerReview",
                    descKey_view: "tour_desc_customerReview_view",
                    viewOnlyRoles: ["Housekeeping"]
                },



                // ── Dashboards ────────────────────────────────────────────────────
                {
                    id: "id9roomTile",
                    headerKey: "bookingDashboard",
                    descKey: "tour_desc_bookingDashboard"
                },
                {
                    id: "id10roomTile",
                    headerKey: "paymentdashboard",
                    descKey: "tour_desc_paymentDashboard"
                },
                {
                    id: "TP_ComplaintDashBoardTile",
                    headerKey: "complainDashboard",
                    descKey: "tour_desc_complainDashboard",
                    descKey_view: "tour_desc_complainDashboard_view",
                    viewOnlyRoles: ["Housekeeping"]
                },
                {
                    id: "TP_DamageDashboard",
                    headerKey: "damageDashboard",
                    descKey: "tour_desc_damageDashboard"
                }
            ];

            // ── Role-aware description resolver ───────────────────────────────────
            var fnResolveDesc = function (config) {
                var bIsViewOnly = config.viewOnlyRoles &&
                    config.viewOnlyRoles.indexOf(sRole) !== -1;


                var sKey = (bIsViewOnly && config.descKey_view)
                    ? config.descKey_view
                    : config.descKey;

                return oBundle ? oBundle.getText(sKey) : sKey;
            };

            var aAllSteps = aTileConfig.map(function (config) {
                return {
                    ui5Id: config.id,
                    title: oBundle ? oBundle.getText(config.headerKey) : config.headerKey,
                    description: fnResolveDesc(config),
                    media: ""
                };
            });

            // Only include tiles that are visible AND rendered in DOM
            this._aPendingTileSteps = aAllSteps.filter(function (step) {
                var oControl = oView.byId(step.ui5Id);
                return oControl &&
                    oControl.getVisible &&
                    oControl.getVisible() &&
                    !!oControl.getDomRef();
            });
        },
        _launchTileSteps: function () {
            if (!this._aPendingTileSteps || !this._aPendingTileSteps.length) {
                this._setStepsGuideButtonVisible(true);
                sap.m.MessageToast.show("No tiles available for the guide.");
                return;
            }
            this.initUniversalTour(this._aPendingTileSteps);
        },

        _cleanupTour: function () {
            BaseController.prototype._cleanupTour.apply(this, arguments);
            this._setStepsGuideButtonVisible(true);
        },

        // Raise Bug

           onFileSizeExceed: function (oEvent) {
    const oFileUploader = oEvent.getSource();
    const sFileName = oEvent.getParameter("fileName");

    sap.m.MessageToast.show(`${sFileName} exceeds 2 MB size limit.`);
},
 onSupportrequestChange: function (oEvent) {

    const oFiles = oEvent.getParameter("files");
    if (!oFiles || oFiles.length === 0) return;

    const oView = this.getView();
    const oUploaderData = oView.getModel("UploaderData");
    const oTokenModel = oView.getModel("tokenModel");

    let aAttachments = oUploaderData.getProperty("/attachments") || [];
    let aTokens = oTokenModel.getProperty("/tokens") || [];

    // ✅ Restrict total files to 3
    if (aAttachments.length + oFiles.length > 3) {
        sap.m.MessageToast.show("You can upload a maximum of 3 files only");
        oEvent.getSource().clear();
        return;
    }

    Array.from(oFiles).forEach((oFile) => {

        // ✅ Check if adding this file exceeds limit
        if (aAttachments.length + oFiles.length > 3) {
            sap.m.MessageToast.show("Maximum 3 files allowed");
            return;
        }

        // Check duplicate file name
        const bDuplicate = aAttachments.some(file => file.filename === oFile.name);
        if (bDuplicate) {
            sap.m.MessageToast.show("File already uploaded");
            return;
        }

        // File type validation
        if (!oFile.type.match(/^image\/(jpeg|jpg|png)$/)) {
            sap.m.MessageToast.show("Only JPG, JPEG, PNG allowed");
            return;
        }

        const oReader = new FileReader();

        oReader.onload = (e) => {

            const sBase64 = e.target.result.split(",")[1];

            aAttachments.push({
                filename: oFile.name,
                fileType: oFile.type,
                content: sBase64
            });

            aTokens.push({
                key: oFile.name,
                text: oFile.name
            });

            oUploaderData.setProperty("/attachments", aAttachments);
            oTokenModel.setProperty("/tokens", aTokens);

        };

        oReader.readAsDataURL(oFile);

    });

    oEvent.getSource().clear();
},
        onTokenDelete: function (oEvent) {

            const aDeletedTokens = oEvent.getParameter("tokens");

            if (!aDeletedTokens || aDeletedTokens.length === 0) return;

            const oView = this.getView();
            const oUploaderData = oView.getModel("UploaderData");
            const oTokenModel = oView.getModel("tokenModel");

            let aAttachments = oUploaderData.getProperty("/attachments") || [];
            let aTokens = oTokenModel.getProperty("/tokens") || [];

            aDeletedTokens.forEach((oToken) => {

                const sKey = oToken.getKey();

                aAttachments = aAttachments.filter(file => file.filename !== sKey);
                aTokens = aTokens.filter(token => token.key !== sKey);

            });

            oUploaderData.setProperty("/attachments", aAttachments);
            oTokenModel.setProperty("/tokens", aTokens);

        },

           onAppnamechanges:function(oEvent){
 utils._LCstrictValidationComboBox(oEvent)
        },
        onBugdescriptionchnages:function(oEvent){
              utils._LCvalidateMandatoryField(oEvent)
        },
        onBugRaisedby:function(oEvent){
utils._LCvalidateMandatoryField(oEvent)
        },
        onBugEmailchange: function (oEvent) {
            utils._LCvalidateEmail(oEvent)
        },

        onBugSubmit: async function(){
            const oView = this.getView();
            const oBugModel = oView.getModel("RaiseBugModel").getData();
            const oUploaderData = oView.getModel("UploaderData");

            const aAttachments = this.getView()
                .getModel("UploaderData")
                .getProperty("/attachments") || [];

            let photoPayload = {
                Photo1: "",
                Photo1Name: "",
                Photo1Type: "",
                Photo2: "",
                Photo2Name: "",
                Photo2Type: "",
                Photo3: "",
                Photo3Name: "",
                Photo3Type: ""
            };

            aAttachments.forEach((file, index) => {

                const i = index + 1;

                if (i <= 3) {
                    photoPayload[`Photo${i}`] = file.content;
                    photoPayload[`Photo${i}Name`] = file.filename;
                    photoPayload[`Photo${i}Type`] = file.fileType;
                }

            });
            var isMandatoryValid = (
                utils._LCstrictValidationComboBox(sap.ui.getCore().byId(oView.createId("RB_id_appname")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("RB_id_bugDescription")), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId(oView.createId("RB_id_RaisedBy")), "ID") &&
                utils._LCvalidateEmail(sap.ui.getCore().byId(oView.createId("RB_id_Email")), "ID")
            );

            if (!isMandatoryValid) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            // IMAGE VALIDATION
            if (!aAttachments || aAttachments.length === 0) {
                MessageToast.show("Please upload at least one image.");
                return;
            }

            if (aAttachments.length > 3) {
                MessageToast.show("You can upload maximum 3 images only.");
                return;
            }

            const todayDate = new Date().toISOString().split("T")[0];

            const data = {
                AppName: oBugModel.AppName,
                BugDescription: oBugModel.BugDescription,
                RaisedBy: oBugModel.RaisedBy,
                Email: oBugModel.Email,
                CreatedDate: todayDate,
                Status: "Open",
                ...photoPayload
            };
            const payload = {
                data: data
            };
            this.getBusyDialog();
            await this.ajaxCreateWithJQuery("HM_Bug", payload);
            this.closeBusyDialog()
            MessageToast.show("Bug submitted successfully");

          this.RB_onCancelButtonPress()
        },


        onPressbugs:function(){
             if (!this._RaiseBugDialog) {

                sap.ui.core.Fragment.load({
                    id: this.getView().getId(),
                    name: "sap.ui.com.project1.fragment.RaiseBug",
                    controller: this
                }).then(function (oDialog) {

                    this._RaiseBugDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    oDialog.open();

                    this._RaiseBugDialog.attachAfterClose(() => {
                 
                    this.RB_onCancelButtonPress();
                });

                }.bind(this));

            } else {
                this._RaiseBugDialog.open();
            }
        },
        RB_onCancelButtonPress:function(){
             const oView = this.getView();

    // 1️⃣ Clear model data
    const oBugModel = oView.getModel("RaiseBugModel");
    if (oBugModel) {
        oBugModel.setData({
            AppName: "",
            BugDescription: "",
            RaisedBy: "",
            Email: ""
        });
    }

    //  Clear uploaded images
    const oUploaderData = oView.getModel("UploaderData");
    if (oUploaderData) {
        oUploaderData.setProperty("/attachments", []);
    }

    // 3️⃣ Clear tokens
    const oTokenModel = oView.getModel("tokenModel");
    if (oTokenModel) {
        oTokenModel.setProperty("/tokens", []);
    }

    // 4️⃣ Reset ValueState
    const aFields = [
        "RB_id_appname",
        "RB_id_bugDescription",
        "RB_id_RaisedBy",
        "RB_id_Email"
    ];

    aFields.forEach(id => {
        const oControl = sap.ui.getCore().byId(oView.createId(id));
        if (oControl) {
            oControl.setValueState("None");
        }
    });

    // 5️⃣ Clear file uploader
    const oUploader = sap.ui.getCore().byId(oView.createId("RB_id_FileUploader1"));
    if (oUploader) {
        oUploader.clear();
    }

    // 6️⃣ Close dialog
    this._RaiseBugDialog.close();
        }

    })
})
